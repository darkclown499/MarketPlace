import { getSupabaseClient } from '@/template';

export interface InterstitialAd {
  id: string;
  title: string;
  media_url: string;
  media_type: 'image' | 'video' | 'gif';
  duration_seconds: number;
  skip_after_seconds: number;
  show_after_seconds: number;
  is_active: boolean;
  position: number;
  created_at: string;
}

export async function fetchActiveInterstitials(): Promise<{ data: InterstitialAd[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('interstitial_ads')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data as InterstitialAd[], error: null };
}

export async function fetchAllInterstitials(): Promise<{ data: InterstitialAd[]; error: string | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('interstitial_ads')
    .select('*')
    .order('position', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data as InterstitialAd[], error: null };
}

export async function createInterstitial(input: Omit<InterstitialAd, 'id' | 'created_at'>): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('interstitial_ads').insert(input);
  return { error: error ? error.message : null };
}

export async function updateInterstitial(id: string, updates: Partial<InterstitialAd>): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('interstitial_ads').update(updates).eq('id', id);
  return { error: error ? error.message : null };
}

export async function deleteInterstitial(id: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('interstitial_ads').delete().eq('id', id);
  return { error: error ? error.message : null };
}
