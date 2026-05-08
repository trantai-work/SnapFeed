import av
import torch
import numpy as np
from transformers import VideoMAEImageProcessor, VideoMAEForVideoClassification
from sentence_transformers import SentenceTransformer
from config import MODEL_NAME, TEXT_MODEL_NAME

# Visual model (VideoMAE)
_visual_processor = VideoMAEImageProcessor.from_pretrained(MODEL_NAME)
_visual_model = VideoMAEForVideoClassification.from_pretrained(MODEL_NAME)
_visual_model.eval()

# Text model (Sentence-BERT)
_text_model = SentenceTransformer(TEXT_MODEL_NAME)
_text_model.eval()

VISUAL_WEIGHT = 0.4
TEXT_WEIGHT = 0.6


def _read_video_frames(container, indices: np.ndarray) -> np.ndarray:
    frames = []
    container.seek(0)
    for i, frame in enumerate(container.decode(video=0)):
        if i in indices:
            frames.append(frame.to_ndarray(format="rgb24"))
    return np.stack(frames)


def _extract_visual_embedding(video_path: str) -> np.ndarray:
    """Extract 768-dim visual embedding from video using VideoMAE."""
    with av.open(video_path) as container:
        total_frames = container.streams.video[0].frames
        indices = np.linspace(0, total_frames - 1, 16).astype(int)
        frames = _read_video_frames(container, indices)

    inputs = _visual_processor(list(frames), return_tensors="pt")

    with torch.no_grad():
        outputs = _visual_model(**inputs, output_hidden_states=True, return_dict=True)

    last_hidden = outputs.hidden_states[-1][0]  # (seq_len, hidden_size)
    embedding = last_hidden.mean(dim=0).detach().cpu().float().numpy()
    return embedding


def _extract_text_embedding(title: str, description: str, tags: list[str]) -> np.ndarray:
    """Extract 768-dim text embedding from title, description and tags using Sentence-BERT."""
    parts = []
    if title:
        parts.append(title)
    if description:
        parts.append(description)
    if tags:
        parts.append(" ".join(tags))

    text = " ".join(parts).strip()
    if not text:
        return None

    print(f"[TEXT EMBEDDING] Input: '{text}'")
    embedding = _text_model.encode(text, normalize_embeddings=True)
    return embedding.astype(np.float32)


def extract_embedding(
    video_path: str,
    title: str = "",
    description: str = "",
    tags: list[str] = None,
) -> list[float]:
    """
    Extract final video embedding by combining visual and text embeddings.

    If text metadata is available, combines visual (VideoMAE) and text (Sentence-BERT)
    embeddings with equal weights (0.5 / 0.5). Falls back to visual-only if no text.
    """
    visual_emb = _extract_visual_embedding(video_path)
    # Normalize to unit vector so weights are meaningful when combining
    visual_norm = np.linalg.norm(visual_emb)
    if visual_norm > 0:
        visual_emb = visual_emb / visual_norm

    text_emb = _extract_text_embedding(title, description, tags or [])

    if text_emb is not None:
        combined = VISUAL_WEIGHT * visual_emb + TEXT_WEIGHT * text_emb
        # Re-normalize after combining
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
    else:
        combined = visual_emb

    return combined.tolist()