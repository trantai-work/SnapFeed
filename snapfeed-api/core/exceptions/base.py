from rest_framework.exceptions import APIException


class BaseAPIException(APIException):
    """
    Base class for all custom API exceptions.
    """

    default_detail = "API error"
    default_code = "api_error"

    def __init__(self, message_key: str):
        self.message_key = message_key
        super().__init__(detail=message_key)
