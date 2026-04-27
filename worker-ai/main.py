import time
import os
import boto3

from src.worker.worker import handle_message
from src.pipeline.video_pipeline import VideoPipeline
from config import QUEUE_URL, BACKEND_CREATE_EMBEDDING_URL, BACKEND_UPDATE_STATUS_URL, API_KEY, DOWNLOAD_DIR

sqs = boto3.client("sqs")


def worker_loop():
    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "snapfeed-dev-568137441159-ap-southeast-1-an")
    region_name = os.getenv("AWS_DEFAULT_REGION", "ap-southeast-1")
    
    pipeline = VideoPipeline(
        bucket_name=bucket_name,
        region_name=region_name,
        backend_url=BACKEND_CREATE_EMBEDDING_URL,
        backend_update_status_url=BACKEND_UPDATE_STATUS_URL,
        api_key=API_KEY,
        download_dir=DOWNLOAD_DIR,
        hls_output_dir="./hls_output"
    )
    
    print(f"Worker started. Listening to queue: {QUEUE_URL}")
    
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20
            )

            messages = response.get("Messages", [])

            if not messages:
                continue

            for message in messages:
                try:
                    handle_message(message, pipeline)

                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=message["ReceiptHandle"]
                    )

                except Exception as e:
                    print(f"Error processing message: {e}")

        except Exception as e:
            print(f"Error in worker loop: {e}")
            time.sleep(5)


if __name__ == "__main__":
    worker_loop()
