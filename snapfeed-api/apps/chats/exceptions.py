from core.exceptions.base import DomainException


class UserNotInConversationError(DomainException):
    message_key = "user_not_in_conversation"
