import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';

/**
 * OAuth callback screen.
 *
 * On WEB: Supabase redirects here with ?code=... (PKCE) or #access_token=... (implicit).
 *   1. Try exchangeCodeForSession(code) for PKCE flow.
 *   2. If that fails or no code, try getSession() — Supabase may have already set the session.
 *   3. Fallback: redirect to tabs anyway and let AuthRouter sort it out.
 *
 * On MOBILE: expo-web-browser captures the redirect URL and handles it in login.tsx.
 *   This screen is only hit as a rare fallback — redirect immediately to tabs.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          const supabase = getSupabaseClient();

          // ── 1. Hash-based tokens (implicit flow) ──────────────────────────
          if (url.hash && url.hash.includes('access_token')) {
            const hashParams = new URLSearchParams(url.hash.slice(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              router.replace('/(tabs)');
              return;
            }
          }

          // ── 2. PKCE code flow ─────────────────────────────────────────────
          const code = url.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              router.replace('/(tabs)');
              return;
            }
            // Exchange failed — Supabase might have set session via cookie/storage anyway
          }

          // ── 3. Check if session was set by Supabase automatically ─────────
          // Give the client a moment to process the session from storage/cookie
          await new Promise(r => setTimeout(r, 800));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/(tabs)');
            return;
          }

          // ── 4. Auth state change listener (last resort) ───────────────────
          // Wait up to 3 seconds for Supabase to emit SIGNED_IN
          await new Promise<void>((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
              if (event === 'SIGNED_IN') {
                subscription.unsubscribe();
                resolve();
              }
            });
            // Timeout after 3s
            setTimeout(() => { subscription.unsubscribe(); resolve(); }, 3000);
          });

          // Navigate regardless — AuthRouter will send back to login if not authenticated
          router.replace('/(tabs)');
        } catch (_) {
          // Something threw — still try to navigate
          router.replace('/(tabs)');
        }
        return;
      }

      // ── MOBILE fallback ───────────────────────────────────────────────────
      // Session handling already done in login.tsx — just redirect
      setTimeout(() => router.replace('/(tabs)'), 300);
    };

    handle();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A6E5C' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
