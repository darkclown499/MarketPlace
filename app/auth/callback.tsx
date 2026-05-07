import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getSupabaseClient } from '@/template';

type Status = 'loading' | 'error';

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
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Detect language from RTL setting or navigator
  const isAr =
    I18nManager.isRTL ||
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('ar'));

  const handleError = (msg?: string) => {
    const fallback = isAr
      ? 'فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.'
      : 'Google sign-in failed. Please try again.';
    setErrorMsg(msg || fallback);
    setStatus('error');
  };

  useEffect(() => {
    const handle = async () => {
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          const supabase = getSupabaseClient();

          // ── Check for OAuth error params first ───────────────────────────
          const oauthError =
            url.searchParams.get('error_description') ??
            url.searchParams.get('error');
          if (oauthError) {
            handleError(decodeURIComponent(oauthError));
            return;
          }

          // ── 1. Hash-based tokens (implicit flow) ──────────────────────────
          if (url.hash && url.hash.includes('access_token')) {
            const hashParams = new URLSearchParams(url.hash.slice(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) { handleError(error.message); return; }
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
            // Exchange failed — fall through to session check
          }

          // ── 3. Check if session was set by Supabase automatically ─────────
          await new Promise(r => setTimeout(r, 800));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/(tabs)');
            return;
          }

          // ── 4. Auth state change listener (last resort) ───────────────────
          const didSignIn = await new Promise<boolean>((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
              if (event === 'SIGNED_IN') {
                subscription.unsubscribe();
                resolve(true);
              }
            });
            setTimeout(() => { subscription.unsubscribe(); resolve(false); }, 3000);
          });

          if (didSignIn) {
            router.replace('/(tabs)');
          } else {
            handleError();
          }
        } catch (e: any) {
          handleError(e?.message);
        }
        return;
      }

      // ── MOBILE fallback ───────────────────────────────────────────────────
      setTimeout(() => router.replace('/(tabs)'), 300);
    };

    handle();
  }, []);

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          </View>

          <Text style={styles.title}>
            {isAr ? 'فشل تسجيل الدخول' : 'Sign-In Failed'}
          </Text>

          <Text style={styles.message}>{errorMsg}</Text>

          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace('/login')}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>
              {isAr ? 'المحاولة مرة أخرى' : 'Try Again'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.homeLink}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.homeLinkText}>
              {isAr ? 'تخطي والدخول كزائر' : 'Skip and browse'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.loadingText}>
        {isAr ? 'جارٍ تسجيل الدخول...' : 'Signing in...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A6E5C',
    padding: 24,
  },
  loadingContainer: {
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },

  // Error card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A6E5C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    marginTop: 4,
    shadowColor: '#0A6E5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  homeLink: {
    paddingVertical: 8,
  },
  homeLinkText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
});
