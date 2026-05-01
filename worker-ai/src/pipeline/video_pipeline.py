import os
import shutil
import logging
from pathlib import Path
from typing import Optional

import boto3
import httpx

from config import USE_EXTERNAL_HLS, EXTERNAL_HLS_URL
from src.services.hls_encoder import HLSEncoder
from src.services.external_hls_encoder import ExternalHLSEncoder
from src.services.s3_uploader import S3Uploader
from src.services.video_processor import extract_embedding

logger = logging.getLogger(__name__)


class VideoPipeline:
    def __init__(
        self,
        bucket_name: str,
        region_name: str,
        backend_url: str,
        backend_update_status_url: str,
        api_key: str,
        download_dir: str = "./videos",
        hls_output_dir: str = "./hls_output",
    ):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client("s3", region_name=region_name)
        self.s3_uploader = S3Uploader(bucket_name, region_name)
        self.backend_url = backend_url
        self.backend_update_status_url = backend_update_status_url
        self.api_key = api_key
        self.download_dir = download_dir
        self.hls_output_dir = hls_output_dir

        if USE_EXTERNAL_HLS:
            if not EXTERNAL_HLS_URL:
                raise ValueError("EXTERNAL_HLS_URL must be set when USE_EXTERNAL_HLS=true")
            self.hls_encoder = ExternalHLSEncoder(service_url=EXTERNAL_HLS_URL)
            logger.info("Using external HLS encoder: %s", EXTERNAL_HLS_URL)
        else:
            self.hls_encoder = HLSEncoder(segment_duration=6)
            logger.info("Using local HLS encoder (ffmpeg)")

    def process_video(self, video_s3_key: str) -> dict:
        """
        Full video processing pipeline:
        1. Download video from S3
        2. Extract embedding and send to backend (independent of HLS)
        3. Encode to HLS — segments are uploaded to S3 on-the-fly as they are ready
        4. Upload playlist to S3
        5. Update video status to 'ready'
        6. Cleanup local files
        """
        local_video_path = None
        local_hls_dir = None
        embedding_sent = False

        try:
            # Step 1: Download
            local_video_path = self._download_video(video_s3_key)

            # Step 2: Extract embedding and send to backend (do this first, independent of HLS)
            try:
                embedding = extract_embedding(local_video_path)
                logger.info("Embedding extracted: dim=%d", len(embedding))
                backend_response = self._send_to_backend(video_s3_key, embedding)
                logger.info("Embedding sent to backend: %s", backend_response.status_code)
                embedding_sent = True
            except Exception as emb_err:
                logger.error("Failed to extract/send embedding: %s", emb_err)
                # Continue with HLS encoding even if embedding fails

            user_id, video_name = self._parse_s3_key(video_s3_key)
            local_hls_dir = os.path.join(self.hls_output_dir, user_id, video_name)
            s3_hls_prefix = f"hls_output/{user_id}/{video_name}"
            uploaded_segment_keys = []

            # Step 3: Encode — upload each segment to S3 as soon as it is ready
            def on_segment_ready(seg_path: str) -> None:
                filename = os.path.basename(seg_path)
                segment_s3_key = f"{s3_hls_prefix}/{filename}"
                self.s3_uploader.upload_file(seg_path, segment_s3_key, content_type="video/mp2t")
                uploaded_segment_keys.append(segment_s3_key)
                logger.info("Uploaded segment: %s", segment_s3_key)

            hls_result = self.hls_encoder.encode(
                local_video_path,
                local_hls_dir,
                on_segment_ready=on_segment_ready,
            )
            logger.info("HLS encoding completed: %d segments", len(hls_result["segment_paths"]))

            # Step 4: Upload playlist (segments already uploaded on-the-fly)
            upload_result = self.s3_uploader.upload_hls_directory(
                local_hls_dir,
                s3_hls_prefix,
                skip_keys=set(uploaded_segment_keys),
            )
            logger.info("Playlist uploaded: %s", upload_result["playlist_key"])

            # Step 5: Update video status
            update_response = self._update_video_status(
                video_s3_key,
                status="ready",
                hls_playlist_key=upload_result["playlist_key"],
            )
            logger.info("Video status updated: %s", update_response.status_code)

            return {
                "success": True,
                "s3_key": video_s3_key,
                "hls_playlist_key": upload_result["playlist_key"],
                "segment_count": len(hls_result["segment_paths"]),
                "embedding_sent": embedding_sent,
            }

        except Exception as e:
            logger.error("Error processing video %s: %s", video_s3_key, e)

            try:
                self._update_video_status(video_s3_key, status="failed")
            except Exception as update_err:
                logger.error("Failed to update video status to 'failed': %s", update_err)

            return {
                "success": False,
                "s3_key": video_s3_key,
                "error": str(e),
                "embedding_sent": embedding_sent,
            }

        finally:
            self._cleanup(local_video_path, local_hls_dir)

    def _download_video(self, s3_key: str) -> str:
        """Download video from S3 to local storage."""
        os.makedirs(self.download_dir, exist_ok=True)
        local_path = os.path.join(self.download_dir, os.path.basename(s3_key))
        logger.info("Downloading s3://%s/%s", self.bucket_name, s3_key)
        self.s3_client.download_file(self.bucket_name, s3_key, local_path)
        return local_path

    def _parse_s3_key(self, s3_key: str) -> tuple[str, str]:
        """
        Parse S3 key into (user_id, video_name).
        Expected format: videos/{user_id}/{filename}.mp4
        """
        parts = s3_key.split("/")
        if len(parts) < 3:
            raise ValueError(f"Invalid S3 key format: {s3_key}")
        return parts[1], Path(parts[2]).stem

    def _send_to_backend(self, video_s3_key: str, embedding: list) -> httpx.Response:
        """Send video embedding to backend API."""
        response = httpx.post(
            self.backend_url,
            json={"video_s3_key": video_s3_key, "embedding": embedding},
            headers={"X-API-KEY": self.api_key},
            timeout=60.0,
        )
        if response.status_code >= 400:
            logger.error("Backend error: %s", response.text)
        return response

    def _update_video_status(
        self, video_s3_key: str, status: str, hls_playlist_key: str = None
    ) -> httpx.Response:
        """Update video status via backend API."""
        payload = {"video_s3_key": video_s3_key, "status": status}
        if hls_playlist_key:
            payload["hls_playlist_key"] = hls_playlist_key

        response = httpx.patch(
            self.backend_update_status_url,
            json=payload,
            headers={"X-API-KEY": self.api_key},
            timeout=30.0,
        )
        if response.status_code >= 400:
            logger.error("Update status error: %s", response.text)
        return response

    def _cleanup(self, video_path: Optional[str], hls_dir: Optional[str]) -> None:
        """Remove temporary local files."""
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
            logger.info("Cleaned up: %s", video_path)
        if hls_dir and os.path.exists(hls_dir):
            shutil.rmtree(hls_dir)
            logger.info("Cleaned up: %s", hls_dir)
