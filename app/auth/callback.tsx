import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';

/**
 * OAuth callback screen.
 *
 * On WEB: Supabase redirects the browser here with ?code=... after Google auth.
 *   We must call exchangeCodeForSession() to complete the OAuth flow.
 *
 * On MOBILE: expo-web-browser captures the redirect URL and passes it back to
 *   login.tsx, so this screen is rarely hit. We just redirect to tabs as fallback.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);

          // Hash-based tokens (implicit flow) — set session directly
          if (url.hash && url.hash.includes('access_token')) {
            const hashParams = new URLSearchParams(url.hash.slice(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              const supabase = getSupabaseClient();
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              router.replace('/(tabs)');
              return;
            }
          }

          // PKCE code flow — exchange code for session
          const code = url.searchParams.get('code');
          if (code) {
            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              router.replace('/(tabs)');
              return;
            }
          }
        } catch (_) {}
      }

      // Mobile fallback — session already handled in login.tsx
      const timer = setTimeout(() => router.replace('/(tabs)'), 500);
      return () => clearTimeout(timer);
    };

    handle();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A6E5C' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
