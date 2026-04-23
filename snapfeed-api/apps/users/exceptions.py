from core.exceptions.base import DomainException


class CannotFollowYourselfError(DomainException):
    message_key = "can_not_follow_yourself"


class HaveNotFollowUserError(DomainException):
    message_key = "you_havent_followed_this_user"
