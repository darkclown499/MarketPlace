import { useState, useCallback } from 'react';
import { fetchAds, fetchMyAds, Ad } from '@/services/adsService';

export function useAds(params?: { categoryId?: string; search?: string; maxPrice?: number; condition?: 'new' | 'used' | null }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (overrideParams?: typeof params) => {
    setLoading(true);
    setError(null);
    const p = overrideParams ?? params;
    const { data, error } = await fetchAds({
      ...p,
      condition: p?.condition ?? undefined,
    });
    setAds(data);
    setError(error);
    setLoading(false);
  }, [params?.categoryId, params?.search, params?.maxPrice, params?.condition]);

  return { ads, loading, error, load, setAds };
}

export function useMyAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchMyAds();
    setAds(data);
    setError(error);
    setLoading(false);
  };

  return { ads, loading, error, load };
}
