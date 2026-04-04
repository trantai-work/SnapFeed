import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function FeedVideoMobileBarComponent({ videoRef, mediaKey }) {
  const seekingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setCurrent(0);
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    setPlaying(!v.paused);

    const onTime = () => {
      if (!seekingRef.current) setCurrent(v.currentTime);
    };
    const syncDuration = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", syncDuration);
    v.addEventListener("durationchange", syncDuration);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    syncDuration();
    setCurrent(v.currentTime);
    setPlaying(!v.paused);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", syncDuration);
      v.removeEventListener("durationchange", syncDuration);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [mediaKey, videoRef]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, [videoRef]);

  const onRangeChange = useCallback(
    (e) => {
      const v = videoRef.current;
      if (!v) return;
      const t = Number(e.target.value);
      v.currentTime = t;
      setCurrent(t);
    },
    [videoRef]
  );

  const startSeek = useCallback(() => {
    seekingRef.current = true;
  }, []);

  const endSeek = useCallback(() => {
    seekingRef.current = false;
    const v = videoRef.current;
    if (v) setCurrent(v.currentTime);
  }, [videoRef]);

  const max = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const sliderValue = Math.min(Math.max(current, 0), max);

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[25] lg:hidden"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Điều khiển video"
    >
      <div className="flex items-center gap-1.5 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-pink-600 drop-shadow-sm transition active:scale-95 dark:text-pink-300"
          aria-label={playing ? "Tạm dừng" : "Phát"}
        >
          {playing ? (
            <Pause className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={0} />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={max}
          step={0.05}
          value={sliderValue}
          onChange={onRangeChange}
          onMouseDown={startSeek}
          onMouseUp={endSeek}
          onMouseLeave={endSeek}
          onTouchStart={startSeek}
          onTouchEnd={endSeek}
          className="feed-mobile-video-range min-h-0 min-w-0 flex-1 cursor-pointer"
          aria-label="Tiến trình phát"
        />

        <span className="w-[5rem] shrink-0 tabular-nums text-right text-[0.6875rem] font-medium text-pink-600 drop-shadow-sm dark:text-pink-200">
          {formatTime(current)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

export const FeedVideoMobileBar = memo(FeedVideoMobileBarComponent);
