import { useState, useEffect } from 'react';
import { fetchCategories, Category } from '@/services/categoriesService';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchCategories();
    setCategories(data);
    setError(error);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return { categories, loading, error, reload: load };
}
