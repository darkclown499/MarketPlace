import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * OAuth callback screen — handles deep link redirect from Google OAuth.
 * expo-web-browser captures the redirect before it reaches this screen in most cases,
 * but this acts as a fallback when the app is opened via the deep link directly.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // The actual session setting is handled in login.tsx after WebBrowser returns.
    // This screen is a fallback — just redirect to tabs.
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A6E5C' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
