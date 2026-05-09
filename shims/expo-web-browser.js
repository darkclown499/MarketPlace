/**
 * Shim for expo-web-browser — adds maybeCompleteAuthSession which was removed
 * in newer versions but is still called at module load time by template code.
 *
 * Configured via metro.config.js resolver.extraNodeModules.
 */

// Re-export everything from the real package
const real = require('../node_modules/expo-web-browser/build/index');

// Ensure maybeCompleteAuthSession exists (no-op stub if missing)
if (typeof real.maybeCompleteAuthSession !== 'function') {
  real.maybeCompleteAuthSession = function maybeCompleteAuthSession() {
    return { type: 'success' };
  };
}

module.exports = real;
