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
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) keysToRemove.push(key);
    }
    // Check if the stored session has an expired or missing refresh token
    const sessionKey = keysToRemove.find(k => k.includes('auth-token'));
    if (sessionKey) {
      const raw = localStorage.getItem(sessionKey);
      let shouldClear = !raw;
      if (raw && !shouldClear) {
        try {
          const parsed = JSON.parse(raw);
          // Clear if no refresh_token, or if access token is clearly expired
          const hasRefreshToken = !!parsed?.refresh_token;
          const expiresAt: number = parsed?.expires_at ?? 0;
          const isExpired = expiresAt > 0 && expiresAt * 1000 < Date.now();
          if (!hasRefreshToken || isExpired) shouldClear = true;
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
                <Stack.Screen name="favorites" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
