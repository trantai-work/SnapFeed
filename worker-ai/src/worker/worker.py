import json
import os
import urllib.parse

from config import BACKEND_CREATE_EMBEDDING_URL, DOWNLOAD_DIR, API_KEY
from src.pipeline.video_pipeline import VideoPipeline


def handle_message(message, pipeline: VideoPipeline):
    body = json.loads(message["Body"])

    for record in body.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        
        result = pipeline.process_video(key)
        
        if result['success']:
            print(f"Successfully processed: {key}")
        else:
            print(f"Failed to process: {key} - {result.get('error')}")
