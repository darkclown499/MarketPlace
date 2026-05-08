import { useState, useCallback, useRef } from 'react';
import { fetchAds, fetchMyAds, Ad } from '@/services/adsService';

const PAGE_SIZE = 20;
const INITIAL_PAGE_SIZE = 10; // smaller first fetch = faster first paint

export function useAds(params?: { categoryId?: string; search?: string; maxPrice?: number; condition?: 'new' | 'used' | null }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);

  const load = useCallback(async (overrideParams?: typeof params) => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    const p = overrideParams ?? params;
    const { data, error } = await fetchAds({
      ...p,
      condition: p?.condition ?? undefined,
      limit: INITIAL_PAGE_SIZE, // fast first load
      offset: 0,
    });
    setAds(data);
    setHasMore(data.length === INITIAL_PAGE_SIZE);
    setError(error);
    setLoading(false);
  }, [params?.categoryId, params?.search, params?.maxPrice, params?.condition]);

  const loadMore = useCallback(async (currentParams?: typeof params) => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    pageRef.current += 1;
    const p = currentParams ?? params;
    const { data } = await fetchAds({
      ...p,
      condition: p?.condition ?? undefined,
      limit: PAGE_SIZE,
      offset: pageRef.current * PAGE_SIZE,
    });
    setAds(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const newItems = data.filter(a => !existingIds.has(a.id));
      return [...prev, ...newItems];
    });
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, params?.categoryId, params?.search, params?.maxPrice, params?.condition]);

  return { ads, loading, loadingMore, hasMore, error, load, loadMore, setAds };
}

export function useMyAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchMyAds();
    setAds(data);
    setError(error);
    setLoading(false);
  }, []);

  return { ads, loading, error, load };
}
