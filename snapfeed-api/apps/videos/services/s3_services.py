import boto3
from django.conf import settings
from botocore.exceptions import ClientError

from apps.videos.exceptions import (
    S3ObjectNotFoundError,
    NotVideoOwnerError,
    InvalidS3KeyFormatError,
)


def validate_s3_key_format(key: str, user_id: int) -> None:
    """
    Check:
    - format: videos/{user_id}/{filename}
    - ownership
    """

    parts = key.split("/")

    if len(parts) < 3 or parts[0] != "videos":
        raise InvalidS3KeyFormatError()

    if str(user_id) != parts[1]:
        raise NotVideoOwnerError()


def check_s3_object_exists(key: str) -> None:
    """
    Check if file exist in s3.
    """

    s3 = boto3.client("s3")

    try:
        return s3.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
    except ClientError:
        raise S3ObjectNotFoundError()
