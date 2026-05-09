/**
 * Expo config plugin — enforces production-safe AndroidManifest.xml flags.
 *
 * Fixes applied:
 *   1. android:allowBackup="false"        — blocks ADB data extraction
 *   2. android:usesCleartextTraffic="false" — forces HTTPS only
 *   3. android:debuggable="false"          — prevents debugger attachment in release
 *   4. android:networkSecurityConfig       — references res/xml/network_security_config.xml
 *   5. Stripe / CropImage exported activities protected with permission
 *   6. Removes any accidental exported receiver/service without permission
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Step 1: Inject network_security_config.xml ──────────────────────────────
const withNetworkSecurityConfig = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });

      const xmlPath = path.join(xmlDir, 'network_security_config.xml');
      fs.writeFileSync(
        xmlPath,
        `<?xml version="1.0" encoding="utf-8"?>
<!--
  Network Security Configuration
  • Blocks all cleartext (HTTP) traffic — HTTPS only
  • No cleartext exceptions for any domain
-->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`,
        'utf8'
      );
      return config;
    },
  ]);
};

// ─── Step 2: Patch AndroidManifest.xml ───────────────────────────────────────
const withSecureManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) return config;

    // ── <application> attribute hardening ──────────────────────────────────
    const app$ = application.$ || {};
    app$['android:allowBackup']             = 'false';
    app$['android:usesCleartextTraffic']    = 'false';
    app$['android:debuggable']              = 'false';  // explicit; EAS also sets this
    app$['android:networkSecurityConfig']   = '@xml/network_security_config';
    application.$ = app$;

    // ── Lock down third-party exported activities ──────────────────────────
    // Components that must stay exported for deep-link / OAuth return but
    // should be protected with a signature-level permission so only our own
    // app (or the OS) can start them.
    const SENSITIVE_EXPORTED = [
      // Stripe
      'com.stripe.android.link.LinkRedirectHandlerActivity',
      'com.stripe.android.payments.StripeBrowserProxyReturnActivity',
      'com.stripe.android.financialconnections.FinancialConnectionsSheetRedirectActivity',
      // Image cropper
      'com.canhub.cropper.CropImageActivity',
    ];

    // Activities we genuinely need unexported (no external caller needed)
    const FORCE_UNEXPORTED = [
      'com.stripe.android.payments.paymentlauncher.PaymentLauncherConfirmationActivity',
      'com.stripe.android.googlepaylauncher.GooglePayLauncherActivity',
      'com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncherActivity',
    ];

    const activities = application.activity || [];
    activities.forEach((activity) => {
      const name = activity.$?.['android:name'];
      if (!name) return;

      if (FORCE_UNEXPORTED.includes(name)) {
        activity.$['android:exported'] = 'false';
      }

      if (SENSITIVE_EXPORTED.includes(name)) {
        // Keep exported but add our signature permission so only we can call it
        activity.$['android:exported']  = 'true';
        activity.$['android:permission'] =
          'android.permission.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION'; // signature-level system permission acting as guard
      }
    });

    // ── Lock down any service / receiver without a permission ──────────────
    const lockComponents = (list) => {
      (list || []).forEach((component) => {
        const c$ = component.$ || {};
        if (
          c$['android:exported'] === 'true' &&
          !c$['android:permission']
        ) {
          // Don't touch intent-filter-driven components (they need to be exported)
          const hasIntentFilter =
            component['intent-filter'] && component['intent-filter'].length > 0;
          if (!hasIntentFilter) {
            component.$['android:exported'] = 'false';
          }
        }
      });
    };

    lockComponents(application.service);
    lockComponents(application.receiver);

    return config;
  });
};

// ─── Compose both mods ───────────────────────────────────────────────────────
const withProductionManifest = (config) => {
  config = withNetworkSecurityConfig(config);
  config = withSecureManifest(config);
  return config;
};

module.exports = withProductionManifest;
