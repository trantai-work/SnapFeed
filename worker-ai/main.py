import time
import os
import logging
import boto3

from src.worker.worker import handle_message
from src.pipeline.video_pipeline import VideoPipeline
from config import QUEUE_URL, BACKEND_CREATE_EMBEDDING_URL, BACKEND_UPDATE_STATUS_URL, API_KEY, DOWNLOAD_DIR, NEED_HLS, USE_EXTERNAL_HLS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

sqs = boto3.client("sqs")


def worker_loop():
    bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME")
    region_name = os.getenv("AWS_DEFAULT_REGION")
    
    if not bucket_name:
        raise ValueError("AWS_STORAGE_BUCKET_NAME environment variable is required")
    if not region_name:
        raise ValueError("AWS_DEFAULT_REGION environment variable is required")
    
    pipeline = VideoPipeline(
        bucket_name=bucket_name,
        region_name=region_name,
        backend_url=BACKEND_CREATE_EMBEDDING_URL,
        backend_update_status_url=BACKEND_UPDATE_STATUS_URL,
        api_key=API_KEY,
        download_dir=DOWNLOAD_DIR,
        hls_output_dir="./hls_output"
    )
    
    logger.info("Worker started. Listening to queue: %s", QUEUE_URL)
    logger.info("Bucket: %s, Region: %s", bucket_name, region_name)
    logger.info("NEED_HLS=%s, USE_EXTERNAL_HLS=%s", NEED_HLS, USE_EXTERNAL_HLS)
    
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
                    logger.error("Error processing message: %s", e)

        except Exception as e:
            logger.error("Error in worker loop: %s", e)
            time.sleep(5)


if __name__ == "__main__":
    worker_loop()
