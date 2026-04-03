import json
import os
import urllib.parse

import boto3
import httpx

from config import BACKEND_CREATE_EMBEDDING_URL, DOWNLOAD_DIR, API_KEY
from video_processor import extract_embedding, process_video

s3 = boto3.client("s3")


def handle_message(message):
    body = json.loads(message["Body"])

    for record in body.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        local_path = os.path.join(DOWNLOAD_DIR, os.path.basename(key))

        print(f"Downloading s3://{bucket}/{key}")
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        s3.download_file(bucket, key, local_path)

        try:
            # results = process_video(local_path)
            # print(f"Classes for {key}:")
            # for label, prob in results:
            #     print(f"  {label}: {prob:.4f}")

            embedding = extract_embedding(local_path)
            payload = {"video_s3_key": key, "embedding": embedding}

            r = httpx.post(
                BACKEND_CREATE_EMBEDDING_URL,
                json=payload,
                headers={"X-API-KEY": API_KEY},
                timeout=60.0,
            )
            print(f"Backend status: {r.status_code}")
            if r.status_code >= 400:
                print(r.text)
        finally:
            os.remove(local_path)