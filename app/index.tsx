import { AuthRouter } from '@/template';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_SEEN_KEY } from './onboarding';
import { BETA_SEEN_KEY } from './beta-warning';

// Module-level cache so subsequent mounts skip AsyncStorage entirely
let _routeCache: { showOnboarding: boolean; showBeta: boolean } | null = null;

export default function RootScreen() {
  const [route, setRoute] = useState<{ showOnboarding: boolean; showBeta: boolean } | null>(_routeCache);

  useEffect(() => {
    if (_routeCache) return; // already resolved in this session
    // Single multiGet call — cheaper than two sequential getItem calls
    AsyncStorage.multiGet([ONBOARDING_SEEN_KEY, BETA_SEEN_KEY]).then((pairs) => {
      const onboarding = pairs[0][1];
      const beta = pairs[1][1];
      const resolved = {
        showOnboarding: !onboarding,
        showBeta: !!onboarding && !beta,
      };
      _routeCache = resolved;
      setRoute(resolved);
    });
  }, []);

  if (!route) return null;

  if (route.showOnboarding) return <Redirect href="/onboarding" />;
  if (route.showBeta) return <Redirect href="/beta-warning" />;

  return (
    <AuthRouter loginRoute="/login" excludeRoutes={['/login', '/onboarding', '/beta-warning', '/ad', '/search', '/category', '/auth', '/favorites']}>
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
