import os
from dotenv import load_dotenv

load_dotenv()

QUEUE_URL = os.getenv("QUEUE_URL")
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR")
MODEL_NAME = os.getenv("MODEL_NAME")
TEXT_MODEL_NAME = os.getenv("TEXT_MODEL_NAME", "paraphrase-multilingual-mpnet-base-v2")
BACKEND_CREATE_EMBEDDING_URL = os.getenv("BACKEND_CREATE_EMBEDDING_URL")
BACKEND_GET_VIDEO_URL = os.getenv("BACKEND_GET_VIDEO_URL")
API_KEY = os.getenv("API_KEY")
BACKEND_UPDATE_STATUS_URL = os.getenv("BACKEND_UPDATE_STATUS_URL")

USE_EXTERNAL_HLS = os.getenv("USE_EXTERNAL_HLS").lower() == "true"
EXTERNAL_HLS_URL = os.getenv("EXTERNAL_HLS_URL")
NEED_HLS = os.getenv("NEED_HLS", "true").lower() == "true"
