import { AuthRouter } from '@/template';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_SEEN_KEY } from './onboarding';
import { BETA_SEEN_KEY } from './beta-warning';

export default function RootScreen() {
  const [checked, setChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBeta, setShowBeta] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
      AsyncStorage.getItem(BETA_SEEN_KEY),
    ]).then(([onboarding, beta]) => {
      setShowOnboarding(!onboarding);
      setShowBeta(!!onboarding && !beta);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  if (showOnboarding) return <Redirect href="/onboarding" />;
  if (showBeta) return <Redirect href="/beta-warning" />;

  return (
    <AuthRouter loginRoute="/login" excludeRoutes={['/login', '/onboarding', '/beta-warning', '/ad', '/search', '/category']}>
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
