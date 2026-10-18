# Phase 1: foundation and user experience

Scope: Phase 1 of PLAN.md, excluding light/dark theme implementation as requested. The subsequently requested Neon Functions deployment replaces the proposed Cloudflare HTTP backend for this phase. Cloudflare realtime coordination, messaging, push delivery, moderation, and release acceptance remain later-phase work.

## Implementation

| Requirement | Implementation |
| --- | --- |
| Expo Router structure | Routes stay in `src/app`; UI, state, networking, and backend logic live outside routes. `backend/` is a separate private Node.js 24 package. |
| Compatible dependencies | Expo 58.0.14, React Native 0.88.0, Clerk 4.13.0, NativeWind 4.2.7, CSS Interop 0.2.7, Tailwind 3.4.19. npm and package-lock retained; dependencies installed with Expo CLI. |
| NativeWind | Metro/CSS integration and explicitly wrapped utility components in `src/components/ui/styled.tsx`. Global JSX interception is deliberately disabled because NativeWind v4 drops the existing Pressable style callbacks. Existing reference screens keep their styles. |
| Android configuration | Nimqulo name, `com.jeeva.nimqulo`, square Nimqulo launcher/adaptive artwork, Nimqulo splash screen, and `triplyai://sso-callback`. |
| APK profiles | EAS development and preview APK profiles use remote signing credentials. Only public Clerk/API settings are included in their shared environment. `.easignore` excludes secrets and server sources. |
| Native navigation | Android and iOS use Expo Router NativeTabs: Chats, People, Settings. Web retains its existing glass tab implementation. Other screens remain stack routes. |
| Approval and authentication | Google OAuth via Clerk, SecureStore token cache, protected routes, strict administrator-owned `publicMetadata.approved === true`. Fresh sign-in routes approved accounts to setup and other accounts to Access Required. Saving a profile never grants approval. |
| Profiles | Authenticated `/profile` GET/PUT; Postgres migration 002. Display names are trimmed and limited to 60 Unicode characters. Usernames accept 3–24 ASCII letters/numbers/underscores, normalize to lowercase, and are unique across users. A database trigger prevents changes to usernames/identity. Display names remain editable. |
| Setup completion | Confirm waits for a successful save before opening Chats. Missing profiles cannot bypass setup by deep linking to another app screen. Existing profile details reload after app restart. Profile state is scoped to the signed-in user and removed when the protected app unmounts. |
| Profile photos | Optional Android image picker/crop followed by Clerk profile-image upload. Existing Clerk photos load automatically; failures permit retry or continuation without a photo. Settings and My Profile use the Neon name/username and Clerk photo. |
| Notifications foundation | SDK-compatible expo-notifications config plugin and Android `messages` channel. The switch reflects both the saved preference and OS permission. Permission is requested when enabling notifications; denial is handled without blocking app access. FCM credentials, push tokens, and message delivery belong to Phase 3. |
| Usability | Profile form has labels, input hints, busy/disabled states, retryable errors, keyboard handling, and scrolling at enlarged text sizes. Shared actions/header controls have expanded touch areas; larger headers can wrap. Existing chat empty states and placeholders remain intact. |

## Validation

```text
npm run build
  Exported: dist
  Backend build passed (Node.js 24)
npm run lint
  exit 0
npx tsc --noEmit
  exit 0
npm test
  17 passed, 0 failed
npx expo-doctor
  20/20 checks passed. No issues detected!
```

Migration 002 passed first on an isolated expiring branch. Live database tests verified that concurrent claims for a username create exactly one profile, username changes fail at the database boundary, non-normalized usernames fail, and display names remain editable. The migration and authenticated API were then deployed to production.

The authenticated app client saved/reloaded a temporary profile through the deployed API and received a conflict when attempting to change its username. Authorization tests cover unsigned/unapproved callers and cannot be bypassed by posting approval or owner fields.

Android checks verified Confirm → Chats, native tab controls, preserved placeholder chats/plus button, profile/session restoration, a profile photo selected/cropped/uploaded to Clerk, and accessible form controls at 150% system text. Offline save failure stays on setup with a readable error; reconnecting and retrying reaches Chats. Keyboard entry/scrolling and rejecting a Home deep link without a saved profile also passed. Temporary QA profiles were removed after validation. Browser checks passed signed-out route protection, Google handoff, popup cancellation, reload, and runtime-error checks.

EAS development build: https://expo.dev/accounts/justjeevan.01/projects/Triply-ai/builds/f471d6a0-2b71-4992-97c0-c0481e0f6088

The EAS build finished successfully and its signed APK was installed on Pixel 8. Native checks verified the `POST_NOTIFICATIONS` manifest permission, the high-importance `messages` channel with default system sound/vibration, the Android permission prompt, denial feedback with continued Chats access, and enabling the switch after granting permission.

An actual Android Google sign-out/sign-in cycle also passed: Back from incomplete setup returned to authentication, and choosing the existing approved Google account returned directly to profile setup.

## Boundaries

This phase does not make the messenger pilot-ready: connection/group/message data remain the existing local fixtures. FCM delivery and two-physical-phone acceptance remain later phases. TalkBack speech/focus order has not been manually audited; labels and states were checked through Android's accessibility hierarchy. The dependencies still have npm audit findings; no breaking dependency upgrades were applied to hide them.
