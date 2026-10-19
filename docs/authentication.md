# Android authentication

Nimqulo uses native Google sign-in through Android Credential Manager and Firebase Authentication. No purchased domain is required. The public OAuth client ID is passed explicitly to the native Google SDK because resource shrinking removes its reflection-based auto-detection resource. SDK configuration runs inside the sign-in action so a configuration error cannot crash route loading. The Android configuration is `google-services.json`; the Firebase Admin service-account credential belongs only on the backend.

## Approval and onboarding

A fresh Google sign-in sends an administrator-approved account to `/profile-setup`. Confirm persists a valid display name and username through the authenticated API and opens `/home`. A confirmed session restores Chats after restart. Other accounts see `/access-required`. Completing a profile, accepting an invitation, or changing a display name cannot grant approval.

Approval is a strict boolean Firebase custom claim. Administrators can review accounts under **Settings ? Moderation** and approve or revoke access. The operator commands below are also available for maintenance. The API independently reads current Firebase approval, requires a verified Google identity, checks revocation and account status, and enforces one active phone. An old token cannot reactivate a signed-out or replaced session. Same-second sign-ins cannot share a binding; a rejected simultaneous login must sign in again.

```sh
npm run access -- list
npm run access -- approve person@example.com
npm run access -- revoke person@example.com
```

These local commands require the ignored `.env.release` server credentials. A person must first sign in with Google to appear in the list. The initial limit is 20 approved active accounts. The command preserves other custom claims and does not reactivate suspended or deleted accounts. Revocation disables the stored phone binding and removes its push token. Operator IDs for moderation are separately configured in the backend environment.

## Configuration

1. Enable Google in Firebase Authentication for project `nimqulo`.
2. Register Android package `com.jeeva.nimqulo` and the existing EAS signing certificate SHA-1 in Firebase.
3. Download the updated `google-services.json` into the root. This is public Android configuration, not a private key.
4. Keep the base64-encoded Admin service-account JSON in `FIREBASE_ADMIN_CONFIG` on the server, alongside `FIREBASE_PROJECT_ID`. Never prefix these with `EXPO_PUBLIC_` or include them in an APK.
5. Build with EAS after changing native authentication modules. Expo Go and previous APKs do not include the new modules.

Firebase persists native credentials. A per-login UUID is stored in SecureStore and combined with the verified authentication time for the backend session binding. ID-token refresh preserves this binding. Sign-out first revokes the current backend binding, then signs out Firebase, clears account caches and returns to `/`. Connectivity failures offer a retry instead of claiming the backend session was revoked.

Optional profile photos are uploaded to private Neon storage. Names, immutable case-insensitive usernames (3?24 letters, numbers or underscores), preferences and application state remain in Postgres.

## Verification

Check Google cancellation, pending-account rejection, approval then fresh sign-in, valid profile confirmation, restart restoration, sign-out, and a second phone replacing the first. Also check suspended/deleted accounts and denied/offline API requests. Record native acceptance separately from unit or isolated database checks; neither proves Google consent on another physical phone.

**Contact Support** opens `mailto:jeevanofficial1120@gmail.com`. **Return to Sign In** ends the local authentication session.

References: [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/), [Firebase Android Google sign-in](https://firebase.google.com/docs/auth/android/google-signin), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
