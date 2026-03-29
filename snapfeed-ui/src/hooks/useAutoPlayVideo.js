import { useEffect, useRef } from "react";

const IN_VIEW_RATIO = 0.55;

/**
 * Autoplay when the slide is primary; reset when re-entering after scroll away.
 * Pass boolean `isActive` for virtualized feed (skips IntersectionObserver).
 */
export function useAutoPlayVideo(
  videoRef,
  scrollRootRef,
  mediaKey,
  isActive
) {
  const userPausedRef = useRef(false);
  const prevInViewRef = useRef(false);
  const prevActivePropRef = useRef(null);
  const useActiveProp = typeof isActive === "boolean";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPause = (e) => {
      if (e.isTrusted) userPausedRef.current = true;
    };
    const onPlay = (e) => {
      if (e.isTrusted) userPausedRef.current = false;
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    return () => {
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
    };
  }, [mediaKey, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (useActiveProp) {
      if (!isActive) {
        prevActivePropRef.current = false;
        video.pause();
        return;
      }
      const entered = prevActivePropRef.current === false;
      prevActivePropRef.current = true;
      if (entered) {
        video.currentTime = 0;
        userPausedRef.current = false;
      }
      if (!userPausedRef.current) {
        video.play().catch(() => {});
      }
      return;
    }

    const root = scrollRootRef?.current ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        const active = e.isIntersecting && e.intersectionRatio >= IN_VIEW_RATIO;

        if (active) {
          const entered = !prevInViewRef.current;
          prevInViewRef.current = true;
          if (entered) {
            video.currentTime = 0;
            userPausedRef.current = false;
          }
          if (!userPausedRef.current) {
            video.play().catch(() => {});
          }
        } else {
          prevInViewRef.current = false;
          video.pause();
        }
      },
      { root, threshold: [0, IN_VIEW_RATIO, 0.75, 1] }
    );

    obs.observe(video);
    return () => obs.disconnect();
  }, [mediaKey, scrollRootRef, videoRef, useActiveProp, isActive]);
}
