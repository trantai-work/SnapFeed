from django.conf import settings

# Use this way instead of using translations for custom messages
_ERROR_MESSAGES = {
    "en": {
        "common": {
            "internal_error": "Internal server error.",
            "invalid_token": "Invalid token.",
            "invalid_basic_auth": "Invalid basic authentication credentials.",
            "account_disabled": "Account disabled.",
            "not_authenticated": "Not authenticated.",
            "permission_denied": "Permission denied.",
            "validation_error": "Validation failed.",
        },
        "missing_google_exchange_code": "Missing Google Exchange Code.",
        "verify_google_oauth2_token_fail": "Verify Google OAuth2 token failed.",
        "missing_facebook_exchange_code": "Missing Facebook Exchange Code.",
    },
    "vi": {
        "common": {
            "internal_error": "Máy chủ gặp lỗi.",
            "invalid_token": "Token không hợp lệ.",
            "invalid_basic_auth": "Thông tin xác thực cơ bản không hợp lệ.",
            "account_disabled": "Tài khoản đã bị vô hiệu hóa.",
            "not_authenticated": "Chưa xác thực.",
            "permission_denied": "Không có quyền truy cập.",
            "validation_error": "Kiểm tra dữ liệu thất bại.",
        },
        "missing_google_exchange_code": "Thiếu Google code.",
        "verify_google_oauth2_token_fail": "Xác minh Google OAuth2 token thất bại.",
        "missing_facebook_exchange_code": "Thiếu Facebook code.",
    },
}

ERROR_MESSAGES = _ERROR_MESSAGES[settings.LANGUAGE_CODE]
