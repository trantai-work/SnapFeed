import time
import boto3
from worker import handle_message
from config import QUEUE_URL

sqs = boto3.client("sqs")


def worker_loop():
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
                    handle_message(message)

                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=message["ReceiptHandle"]
                    )

                except Exception as e:
                    print(e)

        except Exception as e:
            print(e)
            time.sleep(5)


if __name__ == "__main__":
    worker_loop()