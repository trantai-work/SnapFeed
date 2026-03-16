from typing import Any, Dict

from rest_framework import status
from rest_framework.response import Response


def build_response_body(
    *,
    data: Any = None,
    message: str | None = None,
    success: bool = True,
    status_code: int = status.HTTP_200_OK,
) -> Dict[str, Any]:
    return {
        "data": data,
        "message": message,
        "success": success,
        "status_code": status_code,
    }


def build_response(
    *,
    data: Any = None,
    message: str | None = None,
    success: bool = True,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    body = build_response_body(
        data=data,
        message=message,
        success=success,
        status_code=status_code,
    )
    return Response(body, status=status_code)
