# Onboarding Screen — Manual Testing Checklist

> **Purpose:** Verify the onboarding navigation fixes, async state handling, touch targets, and language localization work correctly across device sizes.
>
> **Devices Required:**
> - Small screen: 360×640 dp (e.g., Galaxy A03, Moto G Play) — Android
> - Large screen: 412×915 dp (e.g., Pixel 7, Samsung S24) — Android
> - iPhone SE 3rd gen (375×667 pt) — iOS small
> - iPhone 15 Pro Max (430×932 pt) — iOS large

---

## ✅ Section 1 — First Launch & Routing

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 1.1 | Fresh install: open app for first time | Redirected to `/onboarding` (not login, not home) | ☐ | ☐ |
| 1.2 | Enable `console.log` via Expo Dev Tools and observe logs | See `[Onboarding] goNext -> currentIndex=0` on first Next tap | ☐ | ☐ |
| 1.3 | Complete onboarding, force-kill app, reopen | Redirected to `/beta-warning` (not back to onboarding) | ☐ | ☐ |
| 1.4 | Complete onboarding + beta warning, force-kill, reopen | Redirected directly to login/home (no loops) | ☐ | ☐ |
| 1.5 | Simulate AsyncStorage failure (airplane mode + clear storage mid-flow) | App navigates to beta-warning anyway — no freeze | ☐ | ☐ |

---

## ✅ Section 2 — Next Button (Core Bug Fix)

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 2.1 | Tap **Next** on slide 1 | Scrolls to slide 2; console log shows `goNext -> scrolling to index 1` | ☐ | ☐ |
| 2.2 | Tap **Next** on slide 2 | Scrolls to slide 3 | ☐ | ☐ |
| 2.3 | Tap **Next** (Get Started) on slide 3 | Navigates to `/beta-warning`; console log shows `finish('next-button') -> TRIGGERED` | ☐ | ☐ |
| 2.4 | **Rapid double-tap** Next button | Navigates only once; second tap blocked; console shows `BLOCKED (lock active)` | ☐ | ☐ |
| 2.5 | Tap Next 10 times quickly | Still only advances one slide at a time, never skips or loops | ☐ | ☐ |
| 2.6 | Tap Next on slide 3 while app is transitioning | Navigation fires exactly once | ☐ | ☐ |
| 2.7 | Verify button height ≥ 58dp visually | Button appears full-width, not clipped by navbar | ☐ | ☐ |
| 2.8 | Tap in the **bottom 20% of screen** on Android (gesture nav zone) | Next button still responds; gesture zone does not intercept | ☐ | ☐ |

---

## ✅ Section 3 — Skip Button

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 3.1 | Tap **Skip** on slide 1 | Navigates to `/beta-warning`; console shows `finish('skip-button') -> TRIGGERED` | ☐ | ☐ |
| 3.2 | Tap **Skip** on slide 2 or 3 | Same result as 3.1 | ☐ | ☐ |
| 3.3 | Rapid double-tap Skip | Fires once only; `BLOCKED` log appears on second tap | ☐ | ☐ |
| 3.4 | Skip touch area ≥ 44×44 pt | Tapping slightly around text label still triggers skip | ☐ | ☐ |

---

## ✅ Section 4 — Swipe Navigation

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 4.1 | Swipe left on slide 1 | Advances to slide 2; console shows `onSwipe -> index 0 -> 1` | ☐ | ☐ |
| 4.2 | Swipe right on slide 2 | Goes back to slide 1 | ☐ | ☐ |
| 4.3 | Swipe left on slide 3 (last) | Does not loop to slide 1; stays on slide 3 | ☐ | ☐ |
| 4.4 | Swipe then immediately tap Next | Navigation counts correctly from swiped position | ☐ | ☐ |
| 4.5 | Swipe quickly 3 times in < 1 second | Index tracks correctly; no desync with dot indicator | ☐ | ☐ |

---

## ✅ Section 5 — Pagination Dots

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 5.1 | Launch onboarding — dot 1 is active | First dot is wide (28dp) and colored `#0A6E5C` | ☐ | ☐ |
| 5.2 | After advancing to slide 2 — dot 2 is active | Second dot widens; console shows `onSwipe` or `goNext` | ☐ | ☐ |
| 5.3 | **Tap dot 3** directly | Scrolls to slide 3 immediately; console shows `dotPress -> index 2` | ☐ | ☐ |
| 5.4 | Tap dot 1 from slide 3 | Jumps back to slide 1 | ☐ | ☐ |
| 5.5 | Verify dot touch area ≥ 44×44 pt | Tapping slightly above/below dot still triggers it | ☐ | ☐ |

---

## ✅ Section 6 — Language Switcher

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 6.1 | Tap **العربية** on slide 1 | Text updates to Arabic; console shows `languageSwitch -> ar, currentIndex=0` | ☐ | ☐ |
| 6.2 | After switching to Arabic on slide 2 | Slide index remains 2 (no reset to 0) | ☐ | ☐ |
| 6.3 | Switch language and immediately swipe | FlatList stays on correct index (re-scroll fix works) | ☐ | ☐ |
| 6.4 | Switch language and tap Next | Next button still advances correctly | ☐ | ☐ |
| 6.5 | Switch to Arabic — check RTL text rendering | Arabic text is right-aligned with no layout overflow | ☐ | ☐ |
| 6.6 | Switch language 5 times rapidly | No flicker loops or incorrect index jumps | ☐ | ☐ |
| 6.7 | Language set in onboarding persists to next screen | Beta-warning and login screens display chosen language | ☐ | ☐ |

---

## ✅ Section 7 — Safe Area & Layout

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 7.1 | Skip button on notched iPhone | Not clipped by notch/status bar; fully tappable | ☐ | ☐ |
| 7.2 | Next button on Android 3-button nav bar | Button is above nav bar; not partially hidden | ☐ | ☐ |
| 7.3 | Next button on Android gesture navigation | Button is fully visible and tappable | ☐ | ☐ |
| 7.4 | Rotate device to landscape on large tablet | Slide layout adapts; no overflow or clipping | ☐ | ☐ |
| 7.5 | Very small screen (360×640) | Illustration, text, dots, and button all visible without scrolling | ☐ | ☐ |
| 7.6 | Check for invisible overlapping containers | Tapping center of slide area does NOT accidentally trigger navigation | ☐ | ☐ |

---

## ✅ Section 8 — Privacy Policy Screen

| # | Test Case | Expected Result | Small Screen | Large Screen |
|---|-----------|-----------------|:---:|:---:|
| 8.1 | Profile → Settings → tap **Privacy Policy** | Opens `/privacy` screen | ☐ | ☐ |
| 8.2 | All 11 accordion sections collapsed on open | Only headers visible initially | ☐ | ☐ |
| 8.3 | Tap section 1 header | Expands body text; other sections remain closed | ☐ | ☐ |
| 8.4 | Tap open section again | Collapses it | ☐ | ☐ |
| 8.5 | Tap **ع** language toggle in privacy screen | All content switches to Arabic immediately | ☐ | ☐ |
| 8.6 | Back button / hardware back | Returns to Profile screen | ☐ | ☐ |
| 8.7 | Back arrow direction in Arabic mode | Arrow points right (→) for RTL | ☐ | ☐ |

---

## ✅ Section 9 — Console Log Audit

Enable Metro logs (`npx expo start`) or Flipper and verify all expected traces appear:

| Action | Expected Console Output |
|--------|------------------------|
| Tap Next (not last slide) | `[Onboarding] goNext -> currentIndex=N` + `scrolling to index N+1` |
| Tap Next on last slide | `[Onboarding] goNext -> last slide, calling finish()` + `finish('next-button') -> TRIGGERED` |
| Rapid double-tap Next | Second tap shows `BLOCKED (lock active)` |
| Tap Skip | `[Onboarding] skipButton -> PRESSED` + `finish('skip-button') -> TRIGGERED` |
| AsyncStorage write success | `finish(...) -> AsyncStorage.setItem SUCCESS` |
| Swipe between slides | `[Onboarding] onSwipe -> index X -> Y` |
| Tap pagination dot | `[Onboarding] dotPress -> index N` |
| Switch language | `[Onboarding] languageSwitch -> ar/en, currentIndex=N` |

---

## ✅ Section 10 — Regression Tests

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 10.1 | Login screen loads after onboarding completion | No blank screen, no extra navigation steps |
| 10.2 | Home feed loads after login | Onboarding does not re-appear |
| 10.3 | Profile → Privacy Policy → Back → navigate to another tab | No navigation stack corruption |
| 10.4 | Open app offline (no internet) | Onboarding renders fully (no network dependency) |
| 10.5 | Switch language in onboarding → navigate to login | Login screen shows previously selected language |

---

## 🐛 How to Report a Failure

If any checkbox fails, note:
1. **Device model + OS version**
2. **Screen size in dp** (`Settings → About Phone → Display Size`)
3. **Step number** (e.g. `2.4`)
4. **Console log output** at time of failure
5. **Screenshot or screen recording**

---

*Checklist version: 1.0 — matches onboarding.tsx refactor from May 2026*
