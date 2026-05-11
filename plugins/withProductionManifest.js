const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin — تطهير الـ AndroidManifest وتأمين التطبيق للإنتاج.
 * يحل مشاكل جوجل بلاي (الصحة، الميديا، والخدمات الأمامية).
 */

// 1. إعداد حماية الشبكة (HTTPS فقط)
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
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`,
        'utf8'
      );
      return config;
    },
  ]);
};

// 2. تحصين الـ Manifest وحماية الـ Activities الحساسة
const withSecureManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) return config;

    const app$ = application.$ || {};
    app$['android:allowBackup'] = 'false';
    app$['android:usesCleartextTraffic'] = 'false';
    app$['android:debuggable'] = 'false';
    app$['android:networkSecurityConfig'] = '@xml/network_security_config';
    application.$ = app$;

    const SENSITIVE_EXPORTED = [
      'com.stripe.android.link.LinkRedirectHandlerActivity',
      'com.stripe.android.payments.StripeBrowserProxyReturnActivity',
      'com.stripe.android.financialconnections.FinancialConnectionsSheetRedirectActivity',
      'com.canhub.cropper.CropImageActivity',
    ];

    const activities = application.activity || [];
    activities.forEach((activity) => {
      const name = activity.$?.['android:name'];
      if (SENSITIVE_EXPORTED.includes(name)) {
        activity.$['android:exported'] = 'true';
        // حماية إضافية باستخدام إذن مستوى النظام
        activity.$['android:permission'] = 'android.permission.BIND_REMOTEVIEWS';
      }
    });

    return config;
  });
};

// 3. القائمة السوداء للأذونات (المسؤولة عن رفض جوجل)
const FORBIDDEN_PERMISSIONS = new Set([
  // الصحة (المشكلة الجديدة)
  'android.permission.ACTIVITY_RECOGNITION',
  
  // الميديا (الصور والفيديو)
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.MANAGE_EXTERNAL_STORAGE',

  // الخدمات الأمامية (Policy Violation)
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_CAMERA',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',

  // أذونات أخرى حساسة
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.READ_PHONE_STATE',
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_SMS'
]);

const withStripForbiddenPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (manifest['uses-permission']) {
      manifest['uses-permission'] = manifest['uses-permission'].filter((perm) => {
        const name = perm.$?.['android:name'];
        return !FORBIDDEN_PERMISSIONS.has(name);
      });
    }

    if (manifest['uses-permission-sdk-23']) {
      manifest['uses-permission-sdk-23'] = manifest['uses-permission-sdk-23'].filter((perm) => {
        const name = perm.$?.['android:name'];
        return !FORBIDDEN_PERMISSIONS.has(name);
      });
    }

    return config;
  });
};

// تجميع كل المهام
const withProductionManifest = (config) => {
  config = withNetworkSecurityConfig(config);
  config = withSecureManifest(config);
  config = withStripForbiddenPermissions(config);
  return config;
};

module.exports = withProductionManifest;