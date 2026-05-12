import os
import shutil
import logging
import time
from pathlib import Path
from typing import Optional

import boto3
import httpx

from config import USE_EXTERNAL_HLS, EXTERNAL_HLS_URL, BACKEND_GET_VIDEO_URL, API_KEY, NEED_HLS
from src.services.hls_encoder import HLSEncoder
from src.services.external_hls_encoder import ExternalHLSEncoder
from src.services.s3_uploader import S3Uploader
from src.services.video_processor import extract_embedding

METADATA_RETRY_ATTEMPTS = 5
METADATA_RETRY_BACKOFF = 2  # seconds, doubles each attempt

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

        if NEED_HLS:
            if USE_EXTERNAL_HLS:
                if not EXTERNAL_HLS_URL:
                    raise ValueError("EXTERNAL_HLS_URL must be set when USE_EXTERNAL_HLS=true")
                self.hls_encoder = ExternalHLSEncoder(service_url=EXTERNAL_HLS_URL)
                logger.info("Using external HLS encoder: %s", EXTERNAL_HLS_URL)
            else:
                self.hls_encoder = HLSEncoder(segment_duration=6)
                logger.info("Using local HLS encoder (ffmpeg)")
        else:
            self.hls_encoder = None
            logger.info("NEED_HLS=false, HLS encoder not initialized")

    def process_video(self, video_s3_key: str) -> dict:
        """
        Full video processing pipeline:
        1. Download video from S3
        2. Fetch video metadata from backend (with retry for race condition)
        3. Extract embedding (visual + text) and send to backend
        4. [If NEED_HLS] Encode to HLS, upload segments and playlist to S3
        5. Update video status to 'ready'
        6. Cleanup local files

        If NEED_HLS=false, skips HLS encoding — video is served directly from S3
        via HTTP range requests.
        """
        local_video_path = None
        local_hls_dir = None
        embedding_sent = False

        try:
            # Step 1: Download
            local_video_path = self._download_video(video_s3_key)

            # Step 2: Fetch video metadata (retry to handle race condition with API)
            metadata = self._fetch_video_metadata(video_s3_key)
            title = metadata.get("title", "") if metadata else ""
            description = metadata.get("description", "") if metadata else ""
            tags = metadata.get("tags") or []
            logger.info("Video metadata — title=%r, description=%r, tags=%r", title, description, tags)

            # Step 3: Extract embedding (visual + text) and send to backend
            try:
                embedding = extract_embedding(
                    local_video_path,
                    title=title,
                    description=description,
                    tags=tags,
                )
                logger.info("Embedding extracted: dim=%d", len(embedding))
                backend_response = self._send_to_backend(video_s3_key, embedding)
                logger.info("Embedding sent to backend: %s", backend_response.status_code)
                embedding_sent = True
            except Exception as emb_err:
                logger.error("Failed to extract/send embedding: %s", emb_err)

            # Step 4: HLS encoding (optional)
            hls_playlist_key = None
            if NEED_HLS:
                hls_playlist_key, local_hls_dir = self._encode_and_upload_hls(
                    local_video_path, video_s3_key
                )
            else:
                logger.info("NEED_HLS=false, skipping HLS encoding")

            # Step 5: Update video status
            final_status = "ready" if NEED_HLS else "failed"
            update_response = self._update_video_status(
                video_s3_key,
                status=final_status,
                hls_playlist_key=hls_playlist_key,
            )
            logger.info("Video status updated: %s (%s)", update_response.status_code, final_status)

            return {
                "success": True,
                "s3_key": video_s3_key,
                "hls_playlist_key": hls_playlist_key,
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
            logger.info("")
            logger.info("=" * 60)

    def _encode_and_upload_hls(self, local_video_path: str, video_s3_key: str) -> tuple[str, str]:
        """Encode video to HLS and upload segments + playlist to S3."""
        user_id, video_name = self._parse_s3_key(video_s3_key)
        local_hls_dir = os.path.join(self.hls_output_dir, user_id, video_name)
        s3_hls_prefix = f"hls_output/{user_id}/{video_name}"
        uploaded_segment_keys = []

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

        upload_result = self.s3_uploader.upload_hls_directory(
            local_hls_dir,
            s3_hls_prefix,
            skip_keys=set(uploaded_segment_keys),
        )
        logger.info("Playlist uploaded: %s", upload_result["playlist_key"])

        return upload_result["playlist_key"], local_hls_dir

    def _fetch_video_metadata(self, video_s3_key: str) -> dict | None:
        """
        Fetch video metadata (title, description, tags) from backend.
        Retries with exponential backoff to handle race condition where
        the S3 event fires before the API has saved the video record.
        Returns None if metadata is unavailable after all attempts.
        """
        delay = METADATA_RETRY_BACKOFF
        for attempt in range(1, METADATA_RETRY_ATTEMPTS + 1):
            try:
                response = httpx.get(
                    BACKEND_GET_VIDEO_URL,
                    params={"video_key": video_s3_key},
                    headers={"X-API-KEY": self.api_key},
                    timeout=10.0,
                )
                if response.status_code == 200:
                    logger.info("Fetched video metadata on attempt %d", attempt)
                    return response.json().get("data", {})
                if response.status_code in (400, 404):
                    logger.warning(
                        "Video not found in DB yet (attempt %d/%d), retrying in %ds...",
                        attempt, METADATA_RETRY_ATTEMPTS, delay,
                    )
                    time.sleep(delay)
                    delay *= 2
                else:
                    logger.error("Unexpected status fetching metadata: %s", response.status_code)
                    return None
            except Exception as e:
                logger.error("Error fetching video metadata (attempt %d): %s", attempt, e)
                time.sleep(delay)
                delay *= 2

        logger.warning("Could not fetch metadata for %s after %d attempts, using visual-only embedding", video_s3_key, METADATA_RETRY_ATTEMPTS)
        return None

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
