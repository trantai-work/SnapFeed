import os
import subprocess
from pathlib import Path


class HLSEncoder:
    def __init__(self, segment_duration=6):
        self.segment_duration = segment_duration

    def encode(self, input_path: str, output_dir: str) -> dict:
        """
        Encode video to HLS format.
        
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
            "ffmpeg",
            "-i", input_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-b:v", "2M",
            "-b:a", "128k",
            "-f", "hls",
            "-hls_time", str(self.segment_duration),
            "-hls_list_size", "0",
            "-hls_segment_filename", segment_pattern,
            playlist_path
        ]
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg encoding failed: {result.stderr}")
        
        segment_paths = sorted([
            os.path.join(output_dir, f)
            for f in os.listdir(output_dir)
            if f.endswith('.ts')
        ])
        
        return {
            'playlist_path': playlist_path,
            'segment_paths': segment_paths
        }
