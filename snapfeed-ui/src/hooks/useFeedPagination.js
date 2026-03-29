import { useCallback, useEffect, useRef, useState } from "react";
import { feedApi } from "../api/feed.api";
import { cursorFromNextUrl } from "../utils/feedPagination";
import { normalizeFeedItem } from "../utils/feedItem";

const DEFAULT_PAGE_SIZE = 5;

export function useFeedPagination(pageSize = DEFAULT_PAGE_SIZE) {
  const [items, setItems] = useState([]);
  const [nextUrl, setNextUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (cursor) => {
      const params = { page_size: pageSize };
      if (cursor) params.cursor = cursor;
      const data = await feedApi.getFeeds(params);
      return {
        results: (data.results ?? []).map(normalizeFeedItem),
        next: data.next ?? null,
      };
    },
    [pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { results, next } = await fetchPage(null);
        if (cancelled) return;
        setItems(results);
        setNextUrl(next);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    const cursor = cursorFromNextUrl(nextUrl);
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const { results, next } = await fetchPage(cursor);
      setItems((prev) => [...prev, ...results]);
      setNextUrl(next);
    } catch (e) {
      setError(e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, nextUrl]);

  return {
    items,
    nextUrl,
    loading,
    loadingMore,
    error,
    loadMore,
  };
}
