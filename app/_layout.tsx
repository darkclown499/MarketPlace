import { AlertProvider, AuthProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requestNotificationPermissions } from '@/hooks/useChat';

// Clear stale Supabase tokens from browser localStorage to prevent
// "Invalid Refresh Token: Refresh Token Not Found" on startup.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) keysToRemove.push(key);
    }
    // Only remove if the token looks corrupted (error would have been thrown)
    // We do a passive check — Supabase will re-auth naturally after clearing.
    const sessionKey = keysToRemove.find(k => k.includes('auth-token'));
    if (sessionKey) {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) keysToRemove.forEach(k => localStorage.removeItem(k));
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
                <Stack.Screen name="favorites" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
