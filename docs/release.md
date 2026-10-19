# Android APK release

Nimqulo is distributed publicly as a signed Android APK outside Google Play. The download does not bypass administrator approval or the initial 20-account limit. No AAB or Play Store submission is required.

## Release infrastructure

- Separate Neon schema-only branch `pilot` (`br-square-feather-a14064tt`), with no copied development users, sessions, chats or push tokens. The inherited database password was rotated; old credentials fail on release while development remains accessible. Storage and coordinator secrets are distinct.
- Migrations through 008 applied. The authenticated API, private `assets` storage and scheduled recovery are deployed. Release API: `https://br-square-feather-a14064tt-api.compute.c-1.ap-southeast-1.aws.neon.tech/`.
- Separate Cloudflare coordinator: `https://nimqulo-realtime-pilot.nimqulo-realtime.workers.dev`. Invalid WebSocket tickets return 401. The API and coordinator share only their release service secret.
- Firebase Google authentication replaces Clerk for the release; no purchased domain is required. The Android signing SHA-1 matches the updated Google configuration. The Admin credential is kept only in ignored server configuration, never in the APK. The previously uploaded EAS FCM credential is retained. Local development has also migrated to Firebase; the previous local configuration was archived outside the repository. Development and release share the selected Firebase identity project, while database, storage and coordinator state/credentials remain separate.
- Administrator approval controls are available in Settings > Moderation; operator-only API checks enforce capacity, current Google identity, account status and protected administrator access. Local maintenance commands are documented in authentication.md.

## APK configuration and size

The EAS `release` profile builds a standalone signed phone APK for ARM32/ARM64 with R8 minification, resource shrinking and compressed native libraries. `release-check` is x86_64-only for emulator verification; it is not the phone download. The existing signing key is reused for updates. `app.config.js` rejects the development API and missing/incorrect Firebase configuration.

Removed 52 unused starter/preview assets (3,595,474 bytes) and the unused Clerk/browser-auth packages. Lossless PNG optimization saved 3,817,042 additional source bytes; decoded RGBA pixels and color metadata were verified identical. The supplied launcher icon is unchanged. Source savings do not directly predict APK size.

Current phone build `2284834b-e339-49ab-969f-76eddd7f9e1a` finished successfully in 12m 30s. Version code 4 adds username autocomplete and request/invitation badges, and retains bottom-aligned conversation history and overlapping read-receipt ticks. The signed APK is 36,564,298 bytes (34.9 MiB), supports ARM32/ARM64 and Android 7.0+, and has SHA-256 `7e43da4ff39f4facf789af523ceb46ec38df68a2ad506113dbba1cc32f89516f`. Its signing SHA-1 remains `CE:62:80:46:A9:9D:A8:CA:2C:8C:C7:E7:17:59:36:97:85:65:8B:87`. [Download Nimqulo-v1.apk](https://nimqulo-downloads.nimqulo-realtime.workers.dev/Nimqulo-v1.apk).

Pixel 8 verification of this APK confirmed suggestions from a two-character prefix, optional @/case handling, no matches for middle-only text, and clearing suggestions. The People screen showed its expected zero-count state. Automated tests cover positive badge counts, incoming/outgoing distinctions and clearing after decisions; positive badges still require a real incoming request/invitation on a phone for visual acceptance. It installed over the prior release with the same certificate and preserved the signed-in account. Earlier native checks verified consistent message gaps, compact read ticks and vertical scrolling without reply selection.

## Completed checks

- `npm run lint`, `npm run typecheck`, `npm run build`: passed; Android export and Node.js 24 backend build succeed.
- `npm test`: 30 passing tests, including Firebase policy/client tests; the obsolete Clerk authenticator and its tests were removed.
- Isolated Postgres suite: 21 passing tests, including photo ownership, retry safety, membership periods, payload limits, session revocation and operator approval/capacity.
- Coordinator suite: five passing tests. Expo Doctor: 20/20 checks passed.
- Live development photo upload/send/retry/history/download checks passed, with exact bytes and anonymous storage denial. Only the temporary owner-only QA group, messages and objects were removed afterward.
- Release API health and anonymous/forged/non-Google Firebase rejection passed. A temporary custom-provider Firebase test identity was deleted; no app account was provisioned for it.
- Earlier standalone notification integration passed warm/killed-process checks. The owner subsequently waived further notification-to-chat navigation work; it is not a release gate.

## Remaining acceptance

The installed phone APK reached Access Required with the verified owner Google identity, refreshed approval into profile setup, saved the profile, opened Chats and created an owner-only group. A 1,049,500-byte PNG was selected through the Android photo picker, uploaded, persisted with its message, confirmed as Sent and opened in the photo viewer. Every APK ZIP entry was scanned for configured server secrets/private keys; none were found. The package is non-debuggable. A cold restart restored the authenticated profile; Settings displayed the owner Moderation entry, and its live account list identified the signed-in owner as Administrator with no reports. Confirmed sign-out returned to the authentication screen. Google cancellation restored the enabled sign-in button; repeat Google sign-in restored the saved profile details and Confirm returned to Chats. Profile confirmation on each fresh session is the configured onboarding behavior. The temporary owner-only release QA group, its message/photo object and gallery test image were removed, preserving the real owner profile.

Two physical Android phones are still needed for independent incoming direct/group messages, receipts/typing, replacement, unread counts and reconnect behavior. Do not treat emulator or isolated database tests as those physical checks.

Dependency review fixed the inherited gRPC advisories with a compatible 1.x override. The remaining audit reports 37 findings (12 moderate, 25 high), primarily inherited tooling/transitive advisories without compatible stack fixes. No force downgrade or incompatible framework update was used to conceal them. Record remaining exposure instead of claiming a zero-advisory release.

The README links to the named public download, with exact bytes and SHA-256. Keep a copy of the APK, signing key and backend recovery information. The download streams the existing EAS artifact, so it depends on retaining that build; mirror this same signed APK on the distribution channel for long-term availability.

## Build

```sh
npx eas-cli@latest build --platform android --profile release
```

All `.env.*` files except `.env.example` are excluded from Git/EAS; server sources, design references and test artifacts are excluded from the Android build archive.

## Named APK download

`downloads/worker.mjs` streams the signed EAS artifact at `/Nimqulo-v1.apk`, setting `Content-Disposition: attachment; filename="Nimqulo-v1.apk"`. It preserves the APK bytes/signature and supports HEAD and byte-range requests. The installed app and Android installer use the embedded Nimqulo icon; individual download managers may show a generic APK file icon.

The deployed endpoint passed HEAD/filename checks and a full 36,564,298-byte download matching the release SHA-256. Byte-range requests returned 206 with the requested bytes; unknown paths and write methods returned 404 and 405.

To deploy the download endpoint with the repository's existing Wrangler dependency:

```sh
npm ci --prefix realtime
node realtime/node_modules/wrangler/bin/wrangler.js deploy --config downloads/wrangler.jsonc
```

For a future release, update the download filename/path and artifact URL together. Keep previous version URLs pointing to their original artifacts.
