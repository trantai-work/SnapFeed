import os
from dotenv import load_dotenv

load_dotenv()

QUEUE_URL = os.getenv("QUEUE_URL")
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR")
MODEL_NAME = os.getenv("MODEL_NAME")
BACKEND_CREATE_EMBEDDING_URL = os.getenv("BACKEND_CREATE_EMBEDDING_URL")
API_KEY = os.getenv("API_KEY")