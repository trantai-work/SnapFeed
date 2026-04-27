import os
import shutil
from pathlib import Path
from typing import Optional

import boto3
import httpx

from src.services.hls_encoder import HLSEncoder
from src.services.s3_uploader import S3Uploader
from src.services.video_processor import extract_embedding


class VideoPipeline:
    def __init__(
        self,
        bucket_name: str,
        region_name: str,
        backend_url: str,
        backend_update_status_url: str,
        api_key: str,
        download_dir: str = "./videos",
        hls_output_dir: str = "./hls_output"
    ):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3', region_name=region_name)
        self.s3_uploader = S3Uploader(bucket_name, region_name)
        self.hls_encoder = HLSEncoder(segment_duration=6)
        self.backend_url = backend_url
        self.backend_update_status_url = backend_update_status_url
        self.api_key = api_key
        self.download_dir = download_dir
        self.hls_output_dir = hls_output_dir

    def process_video(self, s3_key: str) -> dict:
        """
        Complete video processing pipeline:
        1. Download video from S3
        2. Encode to HLS
        3. Upload HLS files to S3
        4. Update video status to 'ready'
        5. Extract embedding (background)
        6. Send embedding to backend
        7. Cleanup
        
        Returns:
            dict: Processing results
        """
        local_video_path = None
        local_hls_dir = None
        
        try:
            local_video_path = self._download_video(s3_key)
            
            user_id, video_name = self._parse_s3_key(s3_key)
            
            local_hls_dir = os.path.join(self.hls_output_dir, user_id, video_name)
            hls_result = self.hls_encoder.encode(local_video_path, local_hls_dir)
            print(f"HLS encoding completed: {len(hls_result['segment_paths'])} segments")
            
            s3_hls_prefix = f"hls_output/{user_id}/{video_name}"
            upload_result = self.s3_uploader.upload_hls_directory(local_hls_dir, s3_hls_prefix)
            print(f"HLS uploaded to S3: {upload_result['playlist_url']}")
            
            update_status_response = self._update_video_status(
                s3_key,
                status='ready',
                hls_playlist_url=upload_result['playlist_url']
            )
            print(f"Video status updated: {update_status_response.status_code}")
            
            # TEMPORARY: Comment out for re-encoding old videos (they already have embeddings)
            # embedding = extract_embedding(local_video_path)
            # print(f"Embedding extracted: dim={len(embedding)}")
            # backend_response = self._send_to_backend(s3_key, embedding)
            # print(f"Backend response: {backend_response.status_code}")
            
            return {
                'success': True,
                's3_key': s3_key,
                'hls_playlist_key': upload_result['playlist_key'],
                'hls_playlist_url': upload_result['playlist_url'],
                'segment_count': len(upload_result['segment_urls']),
                # 'backend_status': backend_response.status_code
            }
            
        except Exception as e:
            print(f"Error processing video {s3_key}: {e}")
            
            try:
                self._update_video_status(s3_key, status='failed')
            except Exception as update_err:
                print(f"Failed to update video status to 'failed': {update_err}")
            
            return {
                'success': False,
                's3_key': s3_key,
                'error': str(e)
            }
            
        finally:
            self._cleanup(local_video_path, local_hls_dir)

    def _download_video(self, s3_key: str) -> str:
        """Download video from S3 to local storage."""
        os.makedirs(self.download_dir, exist_ok=True)
        local_path = os.path.join(self.download_dir, os.path.basename(s3_key))
        
        print(f"Downloading s3://{self.bucket_name}/{s3_key}")
        self.s3_client.download_file(self.bucket_name, s3_key, local_path)
        
        return local_path

    def _parse_s3_key(self, s3_key: str) -> tuple[str, str]:
        """
        Parse S3 key to extract user_id and video_name.
        
        Example: videos/2/filename.mp4 -> ('2', 'filename')
        """
        parts = s3_key.split('/')
        if len(parts) < 3:
            raise ValueError(f"Invalid S3 key format: {s3_key}")
        
        user_id = parts[1]
        video_filename = parts[2]
        video_name = Path(video_filename).stem
        
        return user_id, video_name

    def _send_to_backend(self, video_s3_key: str, embedding) -> httpx.Response:
        """Send embedding to backend API."""
        payload = {
            "video_s3_key": video_s3_key,
            "embedding": embedding,
        }
        
        response = httpx.post(
            self.backend_url,
            json=payload,
            headers={"X-API-KEY": self.api_key},
            timeout=60.0
        )
        
        if response.status_code >= 400:
            print(f"Backend error: {response.text}")
        
        return response

    def _update_video_status(self, video_s3_key: str, status: str, hls_playlist_url: str = None) -> httpx.Response:
        """Update video status via backend API."""
        payload = {
            "video_s3_key": video_s3_key,
            "status": status,
        }
        
        if hls_playlist_url:
            payload["hls_playlist_url"] = hls_playlist_url
        
        response = httpx.patch(
            self.backend_update_status_url,
            json=payload,
            headers={"X-API-KEY": self.api_key},
            timeout=30.0
        )
        
        if response.status_code >= 400:
            print(f"Update status error: {response.text}")
        
        return response

    def _cleanup(self, video_path: Optional[str], hls_dir: Optional[str]):
        """Remove temporary files."""
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
            print(f"Cleaned up: {video_path}")
        
        if hls_dir and os.path.exists(hls_dir):
            shutil.rmtree(hls_dir)
            print(f"Cleaned up: {hls_dir}")
