# Google Play Data Safety Declaration
## Souq Qalqilya — سوق قلقيلية

> Fill these answers in the Google Play Console under **App content → Data safety**

---

## Section 1: Data Collection & Sharing

**Does your app collect or share any of the required user data types?**
→ **Yes**

**Is all of the user data collected by your app encrypted in transit?**
→ **Yes** (HTTPS/TLS 1.3 enforced; cleartext disabled)

**Do you provide a way for users to request that their data is deleted?**
→ **Yes** (user can delete account from Profile → Settings → Sign Out, then contact support)

---

## Section 2: Data Types — What to declare

### ✅ Personal info
| Data type | Collected | Shared | Required | Ephemeral |
|-----------|-----------|--------|----------|-----------|
| Email address | Yes | No | Yes | No |
| User IDs | Yes (UUID) | No | Yes | No |
| Name / username | Yes (optional) | No | No | No |
| Phone number | Yes (optional) | No | No | No |

**Purpose:** Account management, authentication

---

### ✅ Photos & Videos
| Data type | Collected | Shared | Required | Ephemeral |
|-----------|-----------|--------|----------|-----------|
| Photos | Yes | No | No (optional) | No |

**Purpose:** App functionality (listing images, profile avatar)
**Note:** Only IMAGE files are accessed. Video is NEVER accessed (READ_MEDIA_VIDEO is blocked).

---

### ✅ Messages
| Data type | Collected | Shared | Required | Ephemeral |
|-----------|-----------|--------|----------|-----------|
| In-app messages | Yes | No | No (opt-in) | No |

**Purpose:** App functionality (buyer-seller communication)

---

### ✅ App activity
| Data type | Collected | Shared | Required | Ephemeral |
|-----------|-----------|--------|----------|-----------|
| App interactions (ad views) | Yes | No | No | No |

**Purpose:** Analytics (ad view counter only — no third-party analytics SDK)

---

### ❌ Data types NOT collected (declare as "No")
- Location (precise or approximate) — NOT collected
- Contacts — NOT collected
- Calendar — NOT collected
- Audio files / recordings — NOT collected
- Health & fitness data — NOT collected
- Financial info — NOT collected
- SMS/MMS — NOT collected
- Web browsing history — NOT collected
- Installed apps — NOT collected
- Device identifiers (IMEI, SSAID) — NOT collected
- Crash logs / diagnostics — NOT sent to any third party

---

## Section 3: Privacy Policy URL

Provide this URL in the Google Play Console:

```
https://souqqalqilya.ps/privacy
```

OR use the in-app privacy policy screen path:
The app includes a built-in Privacy Policy at **Profile → Settings → Privacy Policy** in Arabic and English.

If you don't have a hosted URL yet, use a free hosting service:
- GitHub Pages: Create a `privacy.html` and host at `https://[username].github.io/souq-privacy`
- Notion: Create a public page and share the URL

---

## Section 4: Permissions Justification (for Google Play review)

### READ_MEDIA_IMAGES
**Justification text to enter in Play Console:**
> "Our marketplace app requires access to the photo library so users can select images to upload with their product listings and profile avatar. This is a core feature of the app — users cannot post ads without uploading photos. The app only accesses images selected by the user and never accesses photos in the background."

### CAMERA
**Justification text:**
> "Users can optionally take a photo directly with the device camera to add to their marketplace listing. This is an alternative to selecting from the gallery. Camera access is only requested when the user explicitly taps 'Take Photo' and is never used in the background."

### POST_NOTIFICATIONS
**Justification text:**
> "Push notifications are used exclusively to alert users of new messages from buyers or sellers. This is optional — users can decline notification permission and the app continues to function normally."

---

## Section 5: Sensitive Permissions Checklist (for upload review)

Before submitting, confirm these permissions are NOT in the final AAB manifest:

| Permission | Status |
|------------|--------|
| ACTIVITY_RECOGNITION | ❌ BLOCKED (tools:node="remove") |
| READ_MEDIA_VIDEO | ❌ BLOCKED (tools:node="remove") |
| BODY_SENSORS | ❌ BLOCKED (tools:node="remove") |
| HIGH_SAMPLING_RATE_SENSORS | ❌ BLOCKED (tools:node="remove") |
| FOREGROUND_SERVICE | ❌ BLOCKED (tools:node="remove") |
| FOREGROUND_SERVICE_CAMERA | ❌ BLOCKED (tools:node="remove") |
| FOREGROUND_SERVICE_MICROPHONE | ❌ BLOCKED (tools:node="remove") |
| SYSTEM_ALERT_WINDOW | ❌ BLOCKED (tools:node="remove") |
| ACCESS_FINE_LOCATION | ❌ BLOCKED (tools:node="remove") |
| ACCESS_COARSE_LOCATION | ❌ BLOCKED (tools:node="remove") |
| RECORD_AUDIO | ❌ BLOCKED (tools:node="remove") |
| READ_EXTERNAL_STORAGE | ❌ BLOCKED (tools:node="remove") |
| WRITE_EXTERNAL_STORAGE | ❌ BLOCKED (tools:node="remove") |

---

## Section 6: AAB Build & Submission Steps

### Step 1 — Set environment variables (first time only)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_URL"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_KEY"
```

### Step 2 — Build the signed AAB
```bash
eas build --platform android --profile production
```
- EAS automatically signs with RSA-2048 / SHA-256 (production keystore)
- `autoIncrement: true` bumps versionCode automatically
- Output: `.aab` file (download from EAS dashboard)

### Step 3 — Verify the AAB (optional but recommended)
```bash
# Extract and check manifest permissions
bundletool dump manifest --bundle=app.aab | grep uses-permission
```
Confirm ACTIVITY_RECOGNITION, READ_MEDIA_VIDEO, BODY_SENSORS are absent.

### Step 4 — Upload to Google Play Console
1. Go to Play Console → Your App → Production (or Internal Testing)
2. Create new release → Upload the `.aab` file
3. Fill release notes in Arabic and English
4. Complete Data Safety section using answers above
5. Submit for review

### Step 5 — Expected review timeline
- Internal Testing track: Approved within 1–2 hours
- Production track: 1–7 days for full review

---

## Arabic Release Notes Template

```
الإصدار 1.0.3 — سوق قلقيلية

✨ الجديد:
• تحسينات في الأداء والاستقرار
• صفحة سياسة الخصوصية ثنائية اللغة
• تحسين تجربة التهيئة الأولى

🔒 الأمان:
• تعزيز أمان التطبيق للنشر على Google Play
• تقليل الصلاحيات المطلوبة إلى الحد الأدنى
```

## English Release Notes Template

```
Version 1.0.3 — Souq Qalqilya

✨ What's New:
• Performance and stability improvements
• Bilingual Privacy Policy screen (Arabic/English)
• Improved onboarding experience

🔒 Security:
• Enhanced app security for Google Play compliance
• Reduced permissions to minimum required
```
