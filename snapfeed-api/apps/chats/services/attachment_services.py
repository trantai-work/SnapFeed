from __future__ import annotations

import logging
import uuid

from utils.text import format_content_disposition

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings

from apps.chats.constants import (
    IMAGE_CONTENT_TYPES,
    CHAT_ATTACHMENT_PREFIX,
    MAX_ATTACHMENT_SIZE,
    PRESIGNED_UPLOAD_EXPIRY,
    PRESIGNED_DOWNLOAD_EXPIRY,
)
from apps.chats.exceptions import AttachmentAccessDeniedError
from apps.chats.models import ConversationParticipant

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_DEFAULT_REGION,
        config=Config(s3={"addressing_style": "path"}),
    )


def resolve_attachment_type(content_type: str) -> str:
    return "image" if content_type in IMAGE_CONTENT_TYPES else "file"


def generate_upload_presigned_url(
    *,
    user_id: int,
    conversation_id: int,
    file_name: str,
    content_type: str,
) -> dict:
    """
    Generate a presigned POST URL for uploading a chat attachment to S3.
    Returns { url, fields, s3_key, attachment_type }.
    """

    ext = file_name.rsplit(".", 1)[-1] if "." in file_name else ""
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    s3_key = f"{CHAT_ATTACHMENT_PREFIX}/{conversation_id}/{user_id}/{unique_name}"

    s3 = _get_s3_client()
    presigned = s3.generate_presigned_post(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=s3_key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_ATTACHMENT_SIZE],
        ],
        ExpiresIn=PRESIGNED_UPLOAD_EXPIRY,
    )

    return {
        **presigned,
        "s3_key": s3_key,
        "attachment_type": resolve_attachment_type(content_type),
    }


def generate_download_presigned_url(
    *, user, s3_key: str, download_filename: str | None = None
) -> str:
    """
    Generate a presigned GET URL for downloading a chat attachment.
    Verifies the user is a participant of the conversation the attachment belongs to.
    s3_key format: chat-attachments/{conversation_id}/{user_id}/{filename}
    """

    parts = s3_key.split("/")
    if len(parts) < 4 or parts[0] != CHAT_ATTACHMENT_PREFIX:
        raise AttachmentAccessDeniedError()

    conversation_id = parts[1]
    is_participant = ConversationParticipant.objects.filter(
        conversation_id=conversation_id,
        user=user,
    ).exists()

    if not is_participant:
        raise AttachmentAccessDeniedError()

    s3 = _get_s3_client()
    try:
        params = {
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": s3_key,
        }
        if download_filename:
            params["ResponseContentDisposition"] = format_content_disposition(
                download_filename
            )

        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params=params,
            ExpiresIn=PRESIGNED_DOWNLOAD_EXPIRY,
        )
        return url
    except ClientError as e:
        logger.error("Failed to generate presigned download URL: %s", e)
        raise AttachmentAccessDeniedError()
