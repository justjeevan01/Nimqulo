# Android development on Windows

Nimqulo uses Expo SDK 58 and Android package `com.jeeva.nimqulo`. EAS project: [@justjeevan.01/Triply-ai](https://expo.dev/accounts/justjeevan.01/projects/Triply-ai).

## Builds

`development` includes the development client and connects to development services. `release` produces the signed standalone ARM phone APK; `release-check` is an x86_64 emulator verification build. Rebuild after changing native modules or config plugins. The Firebase/Google native modules are not available in older Clerk APKs or Expo Go.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build:run --platform android --latest
npm run android
```

The release APK runs without Metro, Expo Go or a connected development computer. See [release.md](release.md) for verified artifacts and acceptance status.

## Local configuration

Set the local public API URL and server values using `.env.example`. Google sign-in uses Firebase and Android Credential Manager, not browser SSO. The updated root `google-services.json` must contain the public web OAuth client and the Android signing SHA-1. The SDK receives the client ID explicitly because release resource shrinking removes the auto-detection string. Never place an Admin private key in the public Android configuration or an `EXPO_PUBLIC_` variable.

Display names, usernames, optional private profile photos, preferences and community state persist through the authenticated API. Each fresh approved sign-in opens setup; Confirm saves and opens Home. Pending accounts see Access Required. See [authentication.md](authentication.md).

## Emulator and disk space

Create an Android virtual device with Google Play services in Android Studio. The SDK normally lives under `%LOCALAPPDATA%\Android\Sdk`; virtual-device data and downloaded APKs can be stored on another drive. Use EAS cloud builds to avoid large local Gradle outputs. Generated `android/` and `ios/` directories must not be edited by hand.

`npm run android` prefers IPv4 localhost. On this Windows/Node setup, binding Metro only to `::1` caused ADB forwarding to fail with unexpected-end-of-stream errors. Start Metro with the supplied command after it is fully ready. DNS/network failures should be checked independently of authentication changes; Android Studio supports an explicit emulator `-dns-server` launch option if automatic DNS fails.

Run lint, typecheck and Expo Doctor before release. Native SVG sources use UTF-8 Base64 to avoid Android data-URL decoding issues. Keep temporary screenshots and test artifacts outside the repository; production contains no design-preview routes.
