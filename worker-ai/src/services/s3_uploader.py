import os
from pathlib import Path
import boto3
from botocore.exceptions import ClientError


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
            raise RuntimeError(f"Failed to upload {local_path} to {s3_key}: {e}")

    def upload_hls_directory(self, local_dir: str, s3_prefix: str) -> dict:
        """
        Upload HLS directory (playlist + segments) to S3.
        
        Returns:
            dict: {
                'playlist_url': str (full HTTP URL),
                'playlist_key': str (S3 key),
                'segment_urls': list[str]
            }
        """
        uploaded_files = {
            'playlist_url': None,
            'playlist_key': None,
            'segment_urls': []
        }
        
        print(f"Uploading from local: {local_dir}")
        print(f"Uploading to S3 prefix: {s3_prefix}")
        
        for root, dirs, files in os.walk(local_dir):
            for filename in files:
                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, local_dir)
                s3_key = os.path.join(s3_prefix, relative_path).replace('\\', '/')
                
                print(f"Uploading: {filename} -> {s3_key}")
                
                if filename.endswith('.m3u8'):
                    content_type = 'application/vnd.apple.mpegurl'
                    url = self.upload_file(local_path, s3_key, content_type)
                    uploaded_files['playlist_key'] = s3_key
                    uploaded_files['playlist_url'] = f"{self.bucket_url}/{s3_key}"
                elif filename.endswith('.ts'):
                    content_type = 'video/mp2t'
                    url = self.upload_file(local_path, s3_key, content_type)
                    uploaded_files['segment_urls'].append(s3_key)
                else:
                    url = self.upload_file(local_path, s3_key)
        
        return uploaded_files
