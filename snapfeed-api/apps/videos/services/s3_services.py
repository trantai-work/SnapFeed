import logging

import boto3
from django.conf import settings
from botocore.config import Config
from botocore.exceptions import ClientError

from apps.videos.exceptions import (
    S3ObjectNotFoundError,
    NotVideoOwnerError,
    InvalidS3KeyFormatError,
    MultipartUploadInitError,
    MultipartUploadPartUrlError,
    MultipartUploadCompleteError,
    MultipartUploadAbortError,
)

logger = logging.getLogger(__name__)

PRESIGNED_URL_EXPIRY = 3600  # 1 hour


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_DEFAULT_REGION,
        config=Config(s3={"addressing_style": "path"}),
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

    s3 = _get_s3_client()

    try:
        return s3.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
    except ClientError as e:
        logger.error("S3 object not found. key=%s error=%s", key, e)
        raise S3ObjectNotFoundError()


def generate_presigned_post(s3_key: str, content_type: str) -> dict:
    """
    Generate a presigned POST for single-part upload.
    Returns the { url, fields } dict that the client POSTs to directly.
    """

    from apps.videos.constants import MAX_VIDEO_UPLOAD_SIZE

    s3 = _get_s3_client()

    return s3.generate_presigned_post(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=s3_key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_VIDEO_UPLOAD_SIZE],
        ],
        ExpiresIn=PRESIGNED_URL_EXPIRY,
    )


def initiate_multipart_upload(s3_key: str, content_type: str) -> str:
    """
    Initiate a multipart upload session on S3.
    Returns the UploadId to be used in subsequent part uploads.
    """

    s3 = _get_s3_client()

    try:
        response = s3.create_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            ContentType=content_type,
        )
        return response["UploadId"]
    except ClientError as e:
        logger.error(
            "Failed to initiate multipart upload. s3_key=%s error=%s", s3_key, e
        )
        raise MultipartUploadInitError()


def generate_part_presigned_url(s3_key: str, upload_id: str, part_number: int) -> str:
    """
    Generate a presigned URL for uploading a single part.
    Client should PUT the chunk bytes directly to this URL and collect the ETag from the response header.
    """

    s3 = _get_s3_client()

    try:
        url = s3.generate_presigned_url(
            ClientMethod="upload_part",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": s3_key,
                "UploadId": upload_id,
                "PartNumber": part_number,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
        return url
    except ClientError as e:
        logger.error(
            "Failed to generate part presigned URL. s3_key=%s upload_id=%s part_number=%s error=%s",
            s3_key,
            upload_id,
            part_number,
            e,
        )
        raise MultipartUploadPartUrlError()


def complete_multipart_upload(
    s3_key: str,
    upload_id: str,
    parts: list[dict],
) -> None:
    """
    Complete a multipart upload by assembling all uploaded parts.

    `parts` must be a list of dicts with keys:
        - part_number (int)
        - etag (str)  — value from the ETag response header of each part upload
    """

    s3 = _get_s3_client()

    multipart_parts = [
        {"PartNumber": p["part_number"], "ETag": p["etag"]}
        for p in sorted(parts, key=lambda x: x["part_number"])
    ]

    try:
        s3.complete_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            UploadId=upload_id,
            MultipartUpload={"Parts": multipart_parts},
        )
    except ClientError as e:
        logger.error(
            "Failed to complete multipart upload. s3_key=%s upload_id=%s error=%s",
            s3_key,
            upload_id,
            e,
        )
        raise MultipartUploadCompleteError()


def abort_multipart_upload(s3_key: str, upload_id: str) -> None:
    """
    Abort a multipart upload session and delete all uploaded parts from S3.
    Should be called when the upload is cancelled or fails to avoid orphaned parts incurring storage costs.
    """

    s3 = _get_s3_client()

    try:
        s3.abort_multipart_upload(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            UploadId=upload_id,
        )
    except ClientError as e:
        logger.error(
            "Failed to abort multipart upload. s3_key=%s upload_id=%s error=%s",
            s3_key,
            upload_id,
            e,
        )
        raise MultipartUploadAbortError()


def delete_s3_object(key: str) -> None:
    """Delete a single object from S3."""
    s3 = _get_s3_client()
    try:
        s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        logger.info("Deleted S3 object: %s", key)
    except ClientError as e:
        logger.warning("Failed to delete S3 object %s: %s", key, e)


def delete_s3_directory(prefix: str) -> None:
    """Delete all S3 objects under a given prefix (e.g. HLS directory)."""
    s3 = _get_s3_client()
    try:
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME, Prefix=prefix
        ):
            objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if objects:
                s3.delete_objects(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Delete={"Objects": objects},
                )
                logger.info("Deleted %d S3 objects under %s", len(objects), prefix)
    except ClientError as e:
        logger.warning("Failed to delete S3 directory %s: %s", prefix, e)
