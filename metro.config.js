// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shim expo-web-browser to restore the removed maybeCompleteAuthSession function
// which is still called at module load time by template/auth/supabase/service.ts.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'expo-web-browser': path.resolve(__dirname, 'shims/expo-web-browser.js'),
};

module.exports = config;
