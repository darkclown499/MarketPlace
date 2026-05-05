import { AuthRouter } from '@/template';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_SEEN_KEY } from './onboarding';

export default function RootScreen() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY).then(val => {
      setShowOnboarding(!val);
      setOnboardingChecked(true);
    });
  }, []);

  if (!onboardingChecked) return null;

  if (showOnboarding) return <Redirect href="/onboarding" />;

  return (
    <AuthRouter loginRoute="/login" excludeRoutes={['/login', '/onboarding', '/ad', '/search', '/category']}>
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
