import { useEffect, useRef } from "react";
import { videosApi } from "../api/video.api";

export function useWatchTimeTracker({ videoRef, videoId, isActive, isAuthenticated }) {
  const maxWatchTimeRef = useRef(0);
  const reportedRef = useRef(false);
  const videoIdRef = useRef(videoId);

  // Keep videoIdRef updated
  useEffect(() => {
    if (videoId) videoIdRef.current = videoId;
  }, [videoId]);

  // Reset tracking when new video becomes active
  useEffect(() => {
    if (!isActive) return;
    maxWatchTimeRef.current = 0;
    reportedRef.current = false;
  }, [isActive, videoId]);

  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Track max currentTime while video is active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isAuthenticated) return;

    const onTimeUpdate = () => {
      if (!isActiveRef.current) return;
      const current = Math.floor(video.currentTime);
      if (current > maxWatchTimeRef.current) {
        maxWatchTimeRef.current = current;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, videoId, isAuthenticated]);

  // Report when user leaves the video
  useEffect(() => {
    console.log("[WatchTracker] isActive:", isActive, "videoId:", videoIdRef.current, "watchTime:", maxWatchTimeRef.current, "reported:", reportedRef.current);
    if (isActive || !isAuthenticated) return;
    if (reportedRef.current || maxWatchTimeRef.current <= 0) return;
    if (!videoIdRef.current) return;

    reportedRef.current = true;
    const watchTime = maxWatchTimeRef.current;
    const id = videoIdRef.current;

    console.log("[WatchTracker] Reporting view:", id, watchTime);
    videosApi.recordView({ videoId: id, watchTime }).catch(() => {});
  }, [isActive, isAuthenticated]);

  // Report on unmount
  useEffect(() => {
    return () => {
      if (!isAuthenticated || reportedRef.current || maxWatchTimeRef.current <= 0) return;
      if (!videoIdRef.current) return;
      reportedRef.current = true;
      videosApi.recordView({ videoId: videoIdRef.current, watchTime: maxWatchTimeRef.current }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
