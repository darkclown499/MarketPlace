import { AlertProvider, AuthProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requestNotificationPermissions } from '@/hooks/useChat';

// Clear stale/expired Supabase tokens from browser localStorage to prevent
// "Invalid Refresh Token: Refresh Token Not Found" on startup.
// Refresh tokens can be revoked server-side even if expires_at is future,
// so we clear aggressively: any stored session without a valid refresh token.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) keysToRemove.push(key);
    }
    const sessionKey = keysToRemove.find(k => k.includes('auth-token'));
    if (sessionKey) {
      const raw = localStorage.getItem(sessionKey);
      let shouldClear = !raw;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const hasRefreshToken = !!parsed?.refresh_token;
          const expiresAt: number = parsed?.expires_at ?? 0;
          // Clear if: no refresh token, access token expired, or token was issued
          // more than 7 days ago (refresh tokens typically expire in 7 days)
          const isExpired = expiresAt > 0 && expiresAt * 1000 < Date.now();
          const issuedAt: number = parsed?.user?.created_at
            ? 0
            : (parsed?.issued_at ?? 0);
          const isStale = issuedAt > 0 && (Date.now() / 1000 - issuedAt) > 7 * 24 * 3600;
          if (!hasRefreshToken || isExpired || isStale) shouldClear = true;
        } catch {
          shouldClear = true;
        }
      }
      if (shouldClear) keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (_) {}
}

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions();

    // Runtime handler: clear invalid session when Supabase reports token failure
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Intercept unhandled auth errors logged to console (AuthApiError)
      const originalConsoleError = console.error.bind(console);
      console.error = (...args: any[]) => {
        const msg = args[0]?.message ?? String(args[0] ?? '');
        if (msg.includes('Refresh Token Not Found') || msg.includes('Invalid Refresh Token')) {
          // Silently clear stale tokens and suppress the noise
          try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.includes('supabase')) keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
          } catch (_) {}
          return; // suppress error log
        }
        originalConsoleError(...args);
      };
      return () => { console.error = originalConsoleError; };
    }
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="ad/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
                <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
                <Stack.Screen name="admin/index" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="beta-warning" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                <Stack.Screen name="favorites" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
