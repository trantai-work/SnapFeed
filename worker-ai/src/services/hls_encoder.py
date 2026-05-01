import os
import subprocess
import time
import logging

logger = logging.getLogger(__name__)


class HLSEncoder:
    def __init__(self, segment_duration=6, poll_interval=0.5):
        self.segment_duration = segment_duration
        self.poll_interval = poll_interval

    def encode(self, input_path: str, output_dir: str, on_segment_ready=None) -> dict:
        """
        Encode video to HLS format using ffmpeg.
        Calls on_segment_ready(seg_path) for each segment as soon as it is written,
        without waiting for the full encode to finish.

        Returns:
            dict: {
                'playlist_path': str,
                'segment_paths': list[str]
            }
        """
        os.makedirs(output_dir, exist_ok=True)

        playlist_path = os.path.join(output_dir, "playlist.m3u8")
        segment_pattern = os.path.join(output_dir, "segment_%03d.ts")

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-b:v", "2M",
            "-b:a", "128k",
            "-f", "hls",
            "-hls_time", str(self.segment_duration),
            "-hls_list_size", "0",
            "-hls_segment_filename", segment_pattern,
            playlist_path,
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        seen_segments = set()
        segment_paths = []

        # Poll output_dir while ffmpeg is running
        while process.poll() is None:
            time.sleep(self.poll_interval)
            self._collect_new_segments(
                output_dir, seen_segments, segment_paths, on_segment_ready
            )

        # Collect any remaining segments written after ffmpeg exits
        self._collect_new_segments(
            output_dir, seen_segments, segment_paths, on_segment_ready
        )

        _, stderr = process.communicate()
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg encoding failed: {stderr.decode()}")

        return {
            "playlist_path": playlist_path,
            "segment_paths": sorted(segment_paths),
        }

    def _collect_new_segments(self, output_dir, seen, segment_paths, on_segment_ready):
        """Detect newly completed .ts files and fire the callback."""
        for filename in sorted(os.listdir(output_dir)):
            if not filename.endswith(".ts") or filename in seen:
                continue

            seg_path = os.path.join(output_dir, filename)

            # Wait until ffmpeg has finished writing the file
            # (size stable across two polls means write is complete)
            size_before = os.path.getsize(seg_path)
            time.sleep(self.poll_interval)
            if os.path.getsize(seg_path) != size_before:
                continue  # still being written, pick it up next poll

            seen.add(filename)
            segment_paths.append(seg_path)

            if on_segment_ready:
                try:
                    on_segment_ready(seg_path)
                except Exception as e:
                    logger.error("on_segment_ready error for %s: %s", filename, e)
