import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getSupabaseClient } from '@/template';

type Status = 'loading' | 'error';

/**
 * OAuth callback screen — handles Supabase redirect after Google sign-in.
 *
 * Flow (WEB):
 *   1. Register onAuthStateChange listener immediately — fires as soon as
 *      Supabase processes the code/token in the URL hash/params.
 *   2. Parse URL for explicit tokens (implicit flow) or PKCE code.
 *   3. If PKCE code found, call exchangeCodeForSession.
 *   4. After 5 seconds with no SIGNED_IN event, check session manually.
 *   5. Show error card with retry button if nothing works.
 *
 * Flow (MOBILE):
 *   expo-web-browser captures the redirect in login.tsx.
 *   This screen is only reached as a rare fallback — redirect immediately.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Detect language from RTL setting or browser navigator
  const isAr =
    I18nManager.isRTL ||
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('ar'));

  const goToTabs = () => router.replace('/(tabs)');

  const showError = (msg?: string) => {
    const fallback = isAr
      ? 'فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.'
      : 'Google sign-in failed. Please try again.';
    setErrorMsg(msg || fallback);
    setStatus('error');
  };

  useEffect(() => {
    // ── MOBILE: window exists in RN but window.location is undefined ────
    if (typeof window === 'undefined' || !window.location) {
      setTimeout(goToTabs, 300);
      return;
    }

    const supabase = getSupabaseClient();
    let resolved = false;

    const resolve = (success: boolean, errMsg?: string) => {
      if (resolved) return;
      resolved = true;
      unsubscribe?.();
      clearTimeout(timeoutId);
      if (success) goToTabs();
      else showError(errMsg);
    };

    // ── 1. Listen for auth state change (fires as soon as Supabase sets session) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        resolve(true);
      } else if (event === 'SIGNED_OUT') {
        resolve(false);
      }
    });
    const unsubscribe = () => subscription.unsubscribe();

    // ── 2. Timeout fallback: after 6 seconds, check session manually ───────
    const timeoutId = setTimeout(async () => {
      if (resolved) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          resolve(true);
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    }, 6000);

    // ── 3. Parse URL immediately for explicit tokens or PKCE code ──────────
    const handleUrl = async () => {
      try {
        const url = new URL(window.location.href);

        // Check for OAuth error
        const oauthError =
          url.searchParams.get('error_description') ??
          url.searchParams.get('error');
        if (oauthError) {
          resolve(false, decodeURIComponent(oauthError));
          return;
        }

        // Implicit flow: access_token in hash
        if (url.hash?.includes('access_token')) {
          const hashParams = new URLSearchParams(url.hash.slice(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) resolve(false, error.message);
            // onAuthStateChange will fire SIGNED_IN → resolve(true)
            return;
          }
        }

        // PKCE flow: code in query params
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Exchange failed — fall through to onAuthStateChange timeout
            // Don't call resolve(false) yet — session might already be set
          }
          // onAuthStateChange fires SIGNED_IN if exchange succeeded
          return;
        }

        // No code or token in URL — check if session already exists
        // (Supabase may have set it via implicit flow without hash)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          resolve(true);
        }
        // else: wait for onAuthStateChange timeout
      } catch (e: any) {
        resolve(false, e?.message);
      }
    };

    handleUrl();

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
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
            onPress={goToTabs}
          >
            <Text style={styles.homeLinkText}>
              {isAr ? 'تخطي والتصفح كزائر' : 'Skip and browse'}
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
