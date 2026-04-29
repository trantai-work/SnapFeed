FROM python:3.12.8-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV HF_HOME=/cache/hf

WORKDIR /app

# Runtime libs often needed by video/python-av stacks.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /cache/hf

COPY requirements.docker.txt ./
RUN pip install --upgrade pip && pip install -r requirements.docker.txt

COPY . .

CMD ["python", "-u", "main.py"]
