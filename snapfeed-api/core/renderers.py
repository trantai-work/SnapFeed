from __future__ import annotations

from typing import Any

from djangorestframework_camel_case.render import CamelCaseJSONRenderer

from utils.api_builder import build_response_body


_ENVELOPE_KEYS = {"data", "message", "success", "status_code"}


class EnvelopeCamelCaseJSONRenderer(CamelCaseJSONRenderer):
    def render(
        self,
        data: Any,
        accepted_media_type: str | None = None,
        renderer_context: dict | None = None,
    ) -> bytes:
        # Get DRF response object from context (if any)
        response = None
        if renderer_context:
            response = renderer_context.get("response")

        # Default to 200 if status_code missing
        status_code = getattr(response, "status_code", 200)

        # No content, don't wrap in envelope
        if status_code == 204:
            return super().render(
                data,
                accepted_media_type=accepted_media_type,
                renderer_context=renderer_context,
            )

        # If data already matches envelope format, do not wrap again
        if isinstance(data, dict) and _ENVELOPE_KEYS.issubset(set(data.keys())):
            return super().render(
                data,
                accepted_media_type=accepted_media_type,
                renderer_context=renderer_context,
            )

        # Otherwise, wrap data in envelope structure
        wrapped = build_response_body(
            data=data,
            message=None,
            success=200 <= int(status_code) < 400,
            status_code=int(status_code),
        )
        return super().render(
            wrapped,
            accepted_media_type=accepted_media_type,
            renderer_context=renderer_context,
        )
