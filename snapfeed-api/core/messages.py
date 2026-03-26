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
            "no_refresh_token_found": "No refresh token found.",
        },
        "something_went_wrong": "Something went wrong.",
        "missing_google_exchange_code": "Missing Google Exchange Code.",
        "verify_google_oauth2_token_fail": "Verify Google OAuth2 token failed.",
        "missing_facebook_exchange_code": "Missing Facebook Exchange Code.",
        "invalid_s3_key_format": "Invalid S3 key format.",
        "you_do_not_own_this_video": "You do not own this video.",
        "no_s3_object_exists": "S3 object not found.",
        "lack_of_api_key": "Lack of API key.",
        "invalid_api_key": "Invalid API key.",
        "video_with_s3_key_not_found": "Video with {s3_key} key not found.",
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
            "no_refresh_token_found": "Không tìm thấy refresh token.",
        },
        "something_went_wrong": "Có lỗi xảy ra.",
        "missing_google_exchange_code": "Thiếu Google code.",
        "verify_google_oauth2_token_fail": "Xác minh Google OAuth2 token thất bại.",
        "missing_facebook_exchange_code": "Thiếu Facebook code.",
        "invalid_s3_key_format": "Sai định dạng S3 key.",
        "you_do_not_own_this_video": "Bạn không phải chủ video này.",
        "no_s3_object_exists": "Không tìm thấy S3 object.",
        "lack_of_api_key": "Thiếu API key.",
        "invalid_api_key": "API key không hợp lệ.",
        "video_with_s3_key_not_found": "Video với {s3_key} key không tìm thấy.",
    },
}

_SUCCESS_MESSAGES = {
    "en": {
        "common": {
            "login_success": "Login successful.",
            "logout_success": "Logout successful.",
            "token_refreshed": "Token refreshed.",
        }
    },
    "vi": {
        "common": {
            "login_success": "Đăng nhập thành công.",
            "logout_success": "Đăng xuất thành công.",
            "token_refreshed": "Refresh token thành công.",
        }
    },
}

SUCCESS_MESSAGES = _SUCCESS_MESSAGES[settings.LANGUAGE_CODE]
ERROR_MESSAGES = _ERROR_MESSAGES[settings.LANGUAGE_CODE]
