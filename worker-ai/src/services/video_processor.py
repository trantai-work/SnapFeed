import av
import torch
import numpy as np
from transformers import VideoMAEImageProcessor, VideoMAEForVideoClassification
from config import MODEL_NAME

processor = VideoMAEImageProcessor.from_pretrained(MODEL_NAME)
model = VideoMAEForVideoClassification.from_pretrained(MODEL_NAME)
model.eval()


def read_video_pyav(container, indices):
    frames = []
    container.seek(0)
    for i, frame in enumerate(container.decode(video=0)):
        if i in indices:
            frames.append(frame.to_ndarray(format="rgb24"))
    return np.stack(frames)


def process_video(video_path):
    with av.open(video_path) as container:
        total_frames = container.streams.video[0].frames
        indices = np.linspace(0, total_frames - 1, 16).astype(int)
        video = read_video_pyav(container, indices)

    inputs = processor(list(video), return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    probs = torch.softmax(logits[0], dim=0)
    topk = torch.topk(probs, k=3)

    return [
        (model.config.id2label[int(idx)], float(prob))
        for prob, idx in zip(topk.values, topk.indices)
    ]


def extract_embedding(video_path):
    with av.open(video_path) as container:
        total_frames = container.streams.video[0].frames
        indices = np.linspace(0, total_frames - 1, 16).astype(int)
        video = read_video_pyav(container, indices)

    inputs = processor(list(video), return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True, return_dict=True)

    last_hidden = outputs.hidden_states[-1][0]  # (seq_len, hidden)
    emb = last_hidden.mean(dim=0).detach().cpu().float().numpy()
    print("Embedding dim:", emb.shape)
    return emb.tolist()