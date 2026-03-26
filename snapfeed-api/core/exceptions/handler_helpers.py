def extract_validation_messages(error_data):
    """
    Format DRF ValidationError into a string.

    Example:
    Input: {"title": ["Required"], "thumbnail": ["Invalid", "Too large"]}
    Output:
    Title: Required
    Thumbnail: Invalid, Too large
    """

    messages = []

    if isinstance(error_data, dict):
        for field, errs in error_data.items():
            if isinstance(errs, list):
                field_message = ", ".join(str(e) for e in errs)
            else:
                field_message = str(errs)
            messages.append(f"{field}: {field_message}")
    elif isinstance(error_data, list):
        messages.append(", ".join(str(e) for e in error_data))
    else:
        messages.append(str(error_data))

    return "\n".join(messages)
