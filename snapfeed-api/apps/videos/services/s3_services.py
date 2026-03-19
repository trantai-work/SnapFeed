import boto3
from django.conf import settings
from botocore.exceptions import ClientError

from core.exceptions.exceptions import BusinessException


def validate_s3_key_format(key: str, user_id: int) -> None:
    """
    Check:
    - format: videos/{user_id}/{filename}
    - ownership
    """

    parts = key.split("/")

    if len(parts) < 3 or parts[0] != "videos":
        raise BusinessException(message_key="invalid_s3_key_format")

    if str(user_id) != parts[1]:
        raise BusinessException(message_key="you_do_not_own_this_video")


def check_s3_object_exists(key: str) -> None:
    """
    Check if file exist in s3.
    """

    s3 = boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION_NAME,
    )

    try:
        return s3.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
    except ClientError:
        raise BusinessException(message_key="no_s3_object_exists")
