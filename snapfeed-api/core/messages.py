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
        "google_token_exchange_failed": "Google token exchange failed.",
        "verify_google_oauth2_token_fail": "Verify Google OAuth2 token failed.",
        "invalid_google_token": "Invalid Google token.",
        "missing_facebook_exchange_code": "Missing Facebook Exchange Code.",
        "invalid_s3_key_format": "Invalid S3 key format.",
        "you_do_not_own_this_video": "You do not own this video.",
        "no_s3_object_exists": "S3 object not found.",
        "lack_of_api_key": "Lack of API key.",
        "invalid_api_key": "Invalid API key.",
        "video_with_s3_key_not_found": "Video with {s3_key} key not found.",
        "notification_not_found": "Notification not found.",
        "text_comment_too_long": "Comment text is too long",
        "user_not_in_conversation": "User not in conversation.",
        "attachment_access_denied": "You do not have access to this attachment.",
        "invalid_conversation": "Invalid conversation.",
        "can_not_follow_yourself": "Cannot follow yourself.",
        "you_havent_followed_this_user": "You haven't followed this user.",
        "video_s3_key_is_required": "Video S3 key is requried.",
        "invalid_video_status": "Invalid video status.",
        "multipart_upload_init_failed": "Failed to initiate multipart upload.",
        "multipart_upload_part_url_failed": "Failed to generate presigned URL for part.",
        "multipart_upload_complete_failed": "Failed to complete multipart upload.",
        "multipart_upload_abort_failed": "Failed to abort multipart upload.",
        "invalid_part_number": "Part number must be between 1 and 10000.",
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
        "google_token_exchange_failed": "Trao đổi Google token thất bại.",
        "verify_google_oauth2_token_fail": "Xác minh Google OAuth2 token thất bại.",
        "invalid_google_token": "Google token không hợp lệ.",
        "missing_facebook_exchange_code": "Thiếu Facebook code.",
        "invalid_s3_key_format": "Sai định dạng S3 key.",
        "you_do_not_own_this_video": "Bạn không phải chủ video này.",
        "no_s3_object_exists": "Không tìm thấy S3 object.",
        "lack_of_api_key": "Thiếu API key.",
        "invalid_api_key": "API key không hợp lệ.",
        "video_with_s3_key_not_found": "Video với {s3_key} key không tìm thấy.",
        "notification_not_found": "Không tìm thấy thông báo.",
        "text_comment_too_long": "Nội dung bình luận quá dài",
        "user_not_in_conversation": "Người dùng không nằm trong đoạn chat.",
        "attachment_access_denied": "Bạn không có quyền truy cập file này.",
        "invalid_conversation": "Đoạn chat không hợp lệ.",
        "can_not_follow_yourself": "Không thể theo dõi chính mình.",
        "you_havent_followed_this_user": "Bạn chưa theo dõi người này.",
        "video_s3_key_is_required": "Thiếu video s3 key.",
        "invalid_video_status": "Invalid video status.",
        "multipart_upload_init_failed": "Khởi tạo multipart upload thất bại.",
        "multipart_upload_part_url_failed": "Tạo presigned URL cho part thất bại.",
        "multipart_upload_complete_failed": "Hoàn tất multipart upload thất bại.",
        "multipart_upload_abort_failed": "Hủy multipart upload thất bại.",
        "invalid_part_number": "Part number phải nằm trong khoảng 1 đến 10000.",
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
