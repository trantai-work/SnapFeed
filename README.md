# SnapFeed 🎥✨

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white&style=flat-square)](https://www.djangoproject.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20(pgvector)-4169E1?logo=postgresql&logoColor=white&style=flat-square)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-9.3-005571?logo=elasticsearch&logoColor=white&style=flat-square)](https://www.elastic.co/)
[![AWS](https://img.shields.io/badge/AWS-S3%20%26%20SQS-232F3E?logo=amazon-aws&logoColor=white&style=flat-square)](https://aws.amazon.com/)

**SnapFeed** is a state-of-the-art, production-ready short-form video sharing platform (similar to TikTok/YouTube Shorts) engineered with a modern frontend, a robust real-time microservices-influenced backend, and an intelligent AI recommendation engine. 

The project solves complex engineering challenges including client-side video trans-muxing via WebAssembly, low-latency WebRTC video calling, real-time messaging, and real-time personalized video feeds driven by multimodal deep learning models.

---

## 🛠️ Core Technology Stack

| Layer | Technologies | Key Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v7, Lucide Icons | Responsive UX, smooth transitions, mobile-first design, internationalization (`i18next`). |
| **Video Processing (Client)** | `@ffmpeg/ffmpeg` (WASM), `fix-webm-duration` | In-browser WebM container remuxing, metadata injector, constraint-based WebRTC camera recorder. |
| **Backend API** | Django 6.0, Django REST Framework, SimpleJWT, Daphne | Business logic, secure RESTful APIs, OpenAPI/Swagger via `drf-spectacular`. |
| **Real-time Engine** | Django Channels, WebSockets, Redis 7 (Alpine) | Real-time chat messaging, system notifications, WebRTC peer signaling. |
| **Database** | PostgreSQL 15 + `pgvector` extension | Transactional storage, user vector profiles, HNSW indexes for high-speed similarity search. |
| **Search Engine** | Elasticsearch 9.3 | Phrase-prefix full-text search across video titles, descriptions, and tags. |
| **AI Worker** | Python, PyTorch, SQS, Boto3, PyAV | SQS message polling daemon, video downloader, HLS stream packager (`ffmpeg`). |
| **AI Models** | HuggingFace VideoMAE, Sentence-BERT (`sentence-transformers`) | Visual feature extraction (VideoMAE) and contextual text embeddings (SBERT). |
| **Infrastructure** | Coturn (STUN/TURN), Docker, Docker Compose, Nginx | NAT traversal, service containerization, network routing, storage caching. |


---

## 💡 Key Technical Innovations

### 1. Hybrid Multimodal AI Recommendation Engine
SnapFeed computes personalized video recommendations in real-time by combining deep visual features and textual context:
* **Visual Representation:** The AI worker samples 16 frames uniformly from the video stream and runs them through **VideoMAE** (Video Masked Autoencoder) to extract temporal-spatial visual dynamics.
* **Textual Representation:** Video metadata (Title, Description, Tags) is encoded into semantic vectors using **Sentence-BERT** (`paraphrase-multilingual-mpnet-base-v2`).
* **Vector Combination:** The visual embedding (40% weight) and textual embedding (60% weight) are combined and normalized into a single **768-dimensional unit vector**, stored in PostgreSQL using the `pgvector` extension.
* **Incremental Preference Tracking:** When users watch or react to videos, their profile embedding is updated dynamically:
  $$\vec{E}_{new} = \text{Normalize}\left( W_{acc} \cdot \vec{E}_{old} + w \cdot \vec{E}_{video} \right)$$
  Where the interaction weight ($w$) is determined by the watch ratio and the reaction type (like, share, dislike multipliers).
* **Reranking Pipeline:** Candidate videos are fetched using `pgvector` cosine similarity and then reranked in memory using a composite score:
  $$\text{Score} = 0.5 \cdot \text{Similarity} + 0.3 \cdot \text{Engagement} + 0.2 \cdot \text{Recency}$$

### 2. Client-Side WebAssembly (WASM) Video Pre-processing
Recording video directly in web browsers via WebRTC's MediaRecorder yields a raw WebM file lacking metadata headers (missing duration, keyframe seek indexes). This often causes player issues and breaks server-side AI model pipelines.
* **Solution:** SnapFeed integrates `@ffmpeg/ffmpeg` compiled to **WebAssembly** directly inside the React browser thread.
* **Mechanism:** Upon finishing a recording, the React app uses FFmpeg-WASM to remux the raw stream container, injects standard container metadata, and standardizes video dimensions locally before transmitting the file to AWS S3, offloading expensive transcoding tasks from backend servers.

### 3. Resilient Device-Agnostic WebRTC Recording & Real-time Calling
* **Smart Device Fallback:** In-browser recording handles hardware constraints gracefully. If a camera or microphone permission is denied or missing, it adapts automatically (e.g., falling back to audio-only or adjusting capture frame resolutions dynamically) without crashing the application interface.
* **Signaling & NAT Traversal:** Built a multi-user real-time chat with direct WebRTC peer-to-peer video calls using a custom signalling channel implemented in Django Channels (WebSockets) and configured a Coturn STUN/TURN server to guarantee stable traversal over strict symmetric firewalls.

---

## 🌟 Key Application Features

* **Short-form Video Feed:** Responsive, swipeable feed with lazy loading, auto-play, like/dislike reactions, comments panel, and smooth progress tracking.
* **Instant Messaging & Group Chats:** Live chat channels supporting text messaging, direct video sharing, group chat creation, and live participant lists.
* **WebRTC Video Calls:** Direct P2P calls with video toggle, mute control, and incoming call overlays.
* **Elasticsearch Video Search:** Autocomplete keyword searches across indexed title fields, descriptions, and tags.
* **Moderator Admin Dashboard:** Highly polished control center utilizing glassmorphism, 3D parallax effects, and dark mode grids. Enables moderators to:
  * Review flagged videos and resolve user reports.
  * Inspect user vector preferences and browse graphical profile stats.
  * Manage support tickets and reply to client inquiries in real-time.

---

## ⚙️ Environment Configuration

You need to establish environment files (`.env`) for each subdirectory. Copy the template examples to configure your secrets:

### 1. Backend (`snapfeed-api/.env`)
```ini
DEBUG=1
SECRET_KEY=your_django_secret_key
DB_HOST=db
DB_NAME=snapfeed_db
DB_USER=postgres
DB_PASSWORD=secure_password
MAPPING_DB_PORT=5432
MAPPING_API_PORT=8000
MAPPING_REDIS_PORT=6379
MAPPING_ELASTIC_PORT=9200
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Super Admin Creds
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin_pass

# AWS Configurations
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_STORAGE_BUCKET_NAME=snapfeed-bucket
AWS_DEFAULT_REGION=ap-southeast-1
SQS_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/123456789/snapfeed-queue

# Elasticsearch
ELASTICSEARCH_HOST=http://elasticsearch:9200
API_KEY=backend_worker_shared_secret_api_key
```

### 2. Frontend (`snapfeed-ui/.env`)
```ini
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEFAULT_LANG=en
VITE_S3_BUCKET_URL=https://snapfeed-bucket.s3.ap-southeast-1.amazonaws.com
MAPPING_UI_PORT=3000

# WebRTC TURN Server
VITE_TURN_SERVER_URL=turn:your-turn-server.com:3478
VITE_TURN_USER=turn_user
VITE_TURN_PASS=turn_password
```

### 3. AI Worker (`worker-ai/.env`)
```ini
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=ap-southeast-1
QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/123456789/snapfeed-queue

DOWNLOAD_DIR=./videos
MODEL_NAME=MCG-NJU/videomae-base-short
TEXT_MODEL_NAME=paraphrase-multilingual-mpnet-base-v2

BACKEND_GET_VIDEO_URL=http://api:8000/api/v1/videos/detail_by_key
BACKEND_CREATE_EMBEDDING_URL=http://api:8000/api/v1/video-embeddings
BACKEND_UPDATE_STATUS_URL=http://api:8000/api/v1/videos/update_status
API_KEY=backend_worker_shared_secret_api_key

NEED_HLS=True
USE_EXTERNAL_HLS=False
```

---

## 🚀 Installation & Setup Guide

The application is fully containerized. Follow these steps to spin up the complete service stack (PostgreSQL with `pgvector`, Redis, Elasticsearch, Django ASGI backend, AI worker, and Vite + React frontend) using Docker Compose.

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/trantai-work/SnapFeed.git
   cd SnapFeed
   ```

2. **Run Backend Infrastructures:**
   Configure your backend environments, then build and run the services:
   ```bash
   cd snapfeed-api
   # Ensure you have created and configured the .env file in this directory
   docker-compose up -d --build
   ```

3. **Initialize the Database:**
   Apply database migrations and seed search indexes:
   ```bash
   docker-compose exec api python manage.py migrate
   docker-compose exec api python manage.py create_super_admin
   # Synchronize Elasticsearch indexes
   docker-compose exec api python manage.py search_index --rebuild -f
   ```

4. **Launch AI Worker:**
   Configure the worker environment and spin up the container:
   ```bash
   cd ../worker-ai
   # Ensure you have created and configured the .env file in this directory
   docker-compose up -d --build
   ```

5. **Start Frontend:**
   Install local dependencies and launch the Vite client:
   ```bash
   cd ../snapfeed-ui
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 API Documentation

Once the backend server is running, you can access the interactive OpenAPI/Swagger documentation to inspect routes and try out parameters:

* **Swagger UI:** [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
* **ReDoc UI:** [http://localhost:8000/api/schema/redoc/](http://localhost:8000/api/schema/redoc/)

