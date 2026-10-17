# Android development on Windows

The app is named Nimqulo and uses the Android package `com.jeeva.nimqulo`. `expo-dev-client` is installed at the SDK 58-compatible version. EAS profiles in `eas.json` produce installable APKs: `development` includes the development client, while `preview` produces a standalone internal build.

The project is linked to [@justjeevan.01/Triply-ai on EAS](https://expo.dev/accounts/justjeevan.01/projects/Triply-ai). The first [Android development build](https://expo.dev/accounts/justjeevan.01/projects/Triply-ai/builds/9ddaac0a-e060-4de2-bf17-d712b8e6f8bc) completed successfully and was installed on Pixel 8. Its APK is stored in `D:\Android\builds`. Signing credentials are managed by EAS. Native app startup and the authentication screen were verified on the emulator; completing Google authentication requires the account owner. Profile setup is UI-only: Confirm opens Chats Home without saving account details.

Pixel 8 is configured on this computer. Its virtual-device files are stored in `D:\Android\avd\Pixel_8.avd`, and the user-level `ANDROID_AVD_HOME` points to `D:\Android\avd`. The original C: data was retained as a backup. Existing Android Studio processes should be restarted to pick up the default location for new devices. The Android SDK itself is still under `%LOCALAPPDATA%\Android\Sdk`.

Use EAS cloud builds to avoid filling the nearly full C: drive with local Gradle and Android build outputs. No generated `android/` or `ios/` directories need to be committed or edited by hand.

From the project directory, sign in to Expo and link/configure the project before the first build:

```powershell
npx --yes eas-cli@latest login
npx --yes eas-cli@latest build:configure --platform android
npx --yes eas-cli@latest build --platform android --profile development
```

Install the completed development build into the running emulator:

```powershell
npx --yes eas-cli@latest build:run --platform android --latest
```

Then start Metro and open the installed app:

```powershell
npm run android
```

The Android script starts the development client on localhost with IPv4 DNS resolution. On this Windows/Node setup, the default localhost resolution bound Metro only to `::1`, while ADB reverse forwarding connected to IPv4; this caused an unexpected-end-of-stream error on the emulator. The explicit IPv4 preference resolves that connection issue. Expo opens the installed development client and forwards the emulator's connection to Metro.

The local `.env` supplies the Clerk publishable key when Metro serves JavaScript. A standalone preview build additionally needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` configured in the EAS `preview` environment before building. Never add Clerk secret keys to public environment variables or commit `.env`.

Google sign-in uses the existing browser-based Clerk SSO flow and the `triplyai` scheme. Expo Go cannot supply this project's complete native build configuration. Rebuild the development APK when native modules or config plugins change; ordinary screen changes load from Metro without rebuilding.

Use `npx expo lint`, `npx tsc --noEmit`, and `npx expo install --check` to validate project changes before building.

Emulator verification exposed missing icons from percent-encoded SVG data URLs. Shared SVG sources now use UTF-8 Base64 encoding, which matches Expo Image's Android data-URL loader and also renders on web. Unit checks cover byte alignment/padding and Unicode; browser checks cover the chat UI and signed-out route guards. Screenshots and local build scripts are kept in ignored `visual-review/`.

The floating glass tab bar adds `expo-blur ~58.0.4`. Install a development APK rebuilt with that module to enable native backdrop blur; older installed clients keep the translucent visual fallback. JavaScript styling and navigation changes still refresh through Metro.

The glass-enabled Android development build is [03580681-f977-4610-b74c-cc96065f36bc](https://expo.dev/accounts/justjeevan.01/projects/Triply-ai/builds/03580681-f977-4610-b74c-cc96065f36bc). Its APK is `D:\Android\builds\nimqulo-development-glass-03580681.apk`.
