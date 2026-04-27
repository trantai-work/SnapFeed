import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * HLS Video Player Component
 * Automatically uses HLS.js for m3u8 streams or native video for direct mp4
 */
export default function HLSVideoPlayer({
  src,
  hlsUrl,
  poster,
  className = "",
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = true,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  videoRef: externalRef,
  ...props
}) {
  const internalRef = useRef(null);
  const videoRef = externalRef || internalRef;
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use HLS URL if available, otherwise fallback to regular src
    const streamUrl = hlsUrl || src;
    if (!streamUrl) return;

    // If HLS URL (m3u8) and browser doesn't support HLS natively
    if (streamUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        // Use hls.js
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Video is ready to play
          if (autoPlay) {
            video.play().catch((e) => console.log("Autoplay prevented:", e));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("HLS network error, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS media error, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal error, cannot recover");
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = streamUrl;
      }
    } else {
      // Regular MP4 video
      video.src = streamUrl;
    }
  }, [hlsUrl, src, autoPlay, videoRef]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      {...props}
    />
  );
}
