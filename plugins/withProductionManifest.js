/**
 * Expo config plugin — enforces production-safe AndroidManifest flags:
 *   android:allowBackup="false"
 *   android:usesCleartextTraffic="false"  (already handled by expo-build-properties)
 *
 * EAS automatically sets android:debuggable="false" in release/production builds.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withProductionManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application?.$) {
      // Prevent ADB backup of sensitive app data
      application.$['android:allowBackup'] = 'false';
      // Block plain-text HTTP traffic (HTTPS only)
      application.$['android:usesCleartextTraffic'] = 'false';
    }
    return config;
  });
};

module.exports = withProductionManifest;
