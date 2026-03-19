import uuid
import os


def generate_username():
    return f"user_{uuid.uuid4().hex[:12]}"


def add_uuid_to_filename(file_name: str) -> str:
    name, ext = os.path.splitext(file_name)
    unique_filename = f"{name}_{uuid.uuid4().hex[:12]}{ext}"
    return unique_filename
