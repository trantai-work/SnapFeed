from core.exceptions.base import DomainException


class InvalidS3KeyFormatError(DomainException):
    message_key = "invalid_s3_key_format"


class NotVideoOwnerError(DomainException):
    message_key = "you_do_not_own_this_video"


class S3ObjectNotFoundError(DomainException):
    message_key = "no_s3_object_exists"


class VideoWithS3KeyNotFound(DomainException):
    message_key = "video_with_s3_key_not_found"
