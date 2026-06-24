import { useCallback, useEffect, useRef, useState } from "react";
import { feedApi } from "../api/feed.api";
import { normalizeFeedItem } from "../utils/feedItem";

function toInstances(batchId, videos) {
  const out = [];
  for (let i = 0; i < videos.length; i += 1) {
    out.push({
      instanceId: `${batchId}-${i}`,
      video: videos[i],
    });
  }
  return out;
}

export function useFeedItems(resetKey = "") {
  const [items, setItems] = useState([]);
  const [removingVideoIds, setRemovingVideoIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);
  const batchCounterRef = useRef(0);

  const fetchFeed = useCallback(async () => {
    const data = await feedApi.getFeeds();
    const raw = Array.isArray(data) ? data : data?.results ?? [];
    return raw.map(normalizeFeedItem);
  }, []);

  const loadInitial = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchFeed();
      batchCounterRef.current += 1;
      const batchId = batchCounterRef.current;
      setItems(toInstances(batchId, results));
    } catch (e) {
      setError(e);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    try {
      const results = await fetchFeed();
      batchCounterRef.current += 1;
      const batchId = batchCounterRef.current;
      const instances = toInstances(batchId, results);
      setItems((prev) => [...prev, ...instances]);
    } catch (e) {
      setError(e);
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchFeed]);

  const updateFeedVideo = useCallback((videoId, patch) => {
    setItems((prev) =>
      prev.map((inst) => {
        const v = inst.video ?? inst;
        if (v.id !== videoId) return inst;
        return {
          ...inst,
          video: { ...v, ...patch },
        };
      })
    );
  }, []);

  const removeFeedVideo = useCallback((videoId) => {
    if (!videoId) return;
    setRemovingVideoIds((prev) => {
      const next = new Set(prev);
      next.add(videoId);
      return next;
    });
    window.setTimeout(() => {
      setItems((prev) => prev.filter((inst) => (inst.video ?? inst)?.id !== videoId));
      setRemovingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }, 700);
  }, []);

  useEffect(() => {
    // Reset feed state when auth/user changes (e.g. logout) to avoid showing previous user's reactions.
    inFlightRef.current = false;
    batchCounterRef.current = 0;
    setItems([]);
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return {
    items,
    loading,
    error,
    loadMore,
    updateFeedVideo,
    removeFeedVideo,
    removingVideoIds,
    refresh: loadInitial,
  };
}

