import os
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class S3Uploader:
    def __init__(self, bucket_name: str, region_name: str = None):
        self.bucket_name = bucket_name
        self.region_name = region_name or 'us-east-1'
        self.s3_client = boto3.client('s3', region_name=region_name)
        self.bucket_url = f"https://{bucket_name}.s3.{self.region_name}.amazonaws.com"

    def upload_file(self, local_path: str, s3_key: str, content_type: str = None) -> str:
        """
        Upload a single file to S3.
        
        Returns:
            str: S3 URL of uploaded file
        """
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        try:
            self.s3_client.upload_file(
                local_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            return f"s3://{self.bucket_name}/{s3_key}"
        except ClientError as e:
            logger.error("Failed to upload %s to %s: %s", local_path, s3_key, e)
            raise RuntimeError(f"Failed to upload {local_path} to {s3_key}: {e}")

    def upload_hls_directory(self, local_dir: str, s3_prefix: str, skip_keys: set = None) -> dict:
        """
        Upload HLS directory (playlist + segments) to S3.
        Pass skip_keys to skip files already uploaded on-the-fly.

        Returns:
            dict: {
                'playlist_key': str (S3 key),
                'segment_keys': list[str]
            }
        """
        skip_keys = skip_keys or set()
        uploaded_files = {
            "playlist_key": None,
            "segment_keys": [],
        }

        logger.info("Uploading HLS directory: %s → s3://%s/%s", local_dir, self.bucket_name, s3_prefix)

        for root, dirs, files in os.walk(local_dir):
            for filename in files:
                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, local_dir)
                s3_key = os.path.join(s3_prefix, relative_path).replace("\\", "/")

                if filename.endswith(".m3u8"):
                    self.upload_file(local_path, s3_key, "application/vnd.apple.mpegurl")
                    uploaded_files["playlist_key"] = s3_key
                elif filename.endswith(".ts"):
                    if s3_key in skip_keys:
                        logger.info("Skipping already-uploaded segment: %s", s3_key)
                        uploaded_files["segment_keys"].append(s3_key)
                        continue
                    self.upload_file(local_path, s3_key, "video/mp2t")
                    uploaded_files["segment_keys"].append(s3_key)
                else:
                    self.upload_file(local_path, s3_key)

        return uploaded_files
