import os
import asyncio
import json
import logging

import httpx
import websockets

logger = logging.getLogger(__name__)


class ExternalHLSEncoder:
    """
    Delegates HLS encoding to an external FastAPI service.

    Flow:
    1. POST /encode with the video file → receive job_id
    2. Connect to /ws/{job_id} — receive segments and playlist in real-time
    3. Each segment is written to disk and on_segment_ready(seg_path) is called immediately
    4. Playlist is written after all segments are received
    """

    def __init__(self, service_url: str):
        self.service_url = f"https://{service_url.rstrip('/')}"
        self.ws_url = f"wss://{service_url.rstrip('/')}"

    def encode(self, input_path: str, output_dir: str, on_segment_ready=None) -> dict:
        """
        Synchronous wrapper — matches the same interface as HLSEncoder.encode().

        on_segment_ready(seg_path) is called for each segment as soon as it arrives,
        allowing the caller to upload it to S3 without waiting for the full encode.

        Returns:
            dict: { 'playlist_path': str, 'segment_paths': list[str] }
        """
        return asyncio.run(self._encode_async(input_path, output_dir, on_segment_ready))

    async def _encode_async(
        self, input_path: str, output_dir: str, on_segment_ready=None
    ) -> dict:
        os.makedirs(output_dir, exist_ok=True)

        # Step 1: Submit video to external service, get job_id and ws_url
        job_id, ws_url = await self._submit_video(input_path)
        logger.info("External HLS job started: %s", job_id)

        # Step 2: Stream segments via WebSocket, fire callback per segment
        segment_paths, playlist_path = await self._stream_segments(
            ws_url, output_dir, on_segment_ready
        )
        logger.info("External HLS encoding completed: %d segments", len(segment_paths))

        return {
            "playlist_path": playlist_path,
            "segment_paths": segment_paths,
        }

    async def _submit_video(self, input_path: str) -> tuple[str, str]:
        """POST video file to /encode, return (job_id, ws_url)."""
        filename = os.path.basename(input_path)
        with open(input_path, "rb") as f:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.service_url}/encode",
                    files={"file": (filename, f, "video/mp4")},
                )
                response.raise_for_status()
                data = response.json()
                job_id = data["job_id"]
                # ws_url from response is a relative path e.g. /ws/{job_id}
                ws_url = f"{self.ws_url}{data['ws_url']}"
                return job_id, ws_url

    async def _stream_segments(
        self, ws_url: str, output_dir: str, on_segment_ready=None
    ) -> tuple[list[str], str]:
        """
        Connect to WebSocket and receive segments + playlist.
        Calls on_segment_ready(seg_path) immediately after each segment is written to disk.
        """
        segment_paths = []
        playlist_path = None
        current_segment = None
        segment_buffer = bytearray()

        async with websockets.connect(ws_url) as ws:
            async for raw in ws:
                if isinstance(raw, bytes):
                    segment_buffer.extend(raw)

                elif isinstance(raw, str):
                    event = json.loads(raw)
                    kind = event.get("event")

                    if kind == "segment_start":
                        current_segment = event["filename"]
                        segment_buffer = bytearray()
                        logger.info("Receiving segment: %s", current_segment)

                    elif kind == "segment_end":
                        if current_segment:
                            seg_path = os.path.join(output_dir, current_segment)
                            with open(seg_path, "wb") as f:
                                f.write(segment_buffer)
                            segment_paths.append(seg_path)
                            logger.info("Received segment from stream: %s (%d bytes)", current_segment, len(segment_buffer))

                            if on_segment_ready:
                                try:
                                    # Run in executor — on_segment_ready is sync (e.g. S3 upload)
                                    # and must not block the WebSocket event loop
                                    loop = asyncio.get_event_loop()
                                    await loop.run_in_executor(None, on_segment_ready, seg_path)
                                except Exception as e:
                                    logger.error(
                                        "on_segment_ready error for %s: %s",
                                        current_segment, e,
                                    )

                            current_segment = None
                            segment_buffer = bytearray()

                    elif kind == "playlist":
                        playlist_path = os.path.join(output_dir, event["filename"])
                        with open(playlist_path, "w") as f:
                            f.write(event["content"])

                    elif kind == "done":
                        logger.info(
                            "External HLS encode done in %ss", event.get("elapsed")
                        )
                        break

                    elif kind == "error":
                        raise RuntimeError(
                            f"External HLS service error: {event.get('detail')}"
                        )

        if not playlist_path or not os.path.exists(playlist_path):
            raise RuntimeError("External HLS service did not return a playlist")

        return sorted(segment_paths), playlist_path
