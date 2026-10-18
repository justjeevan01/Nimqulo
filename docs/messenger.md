# Messenger implementation and pilot readiness

Nimqulo targets Android. The existing screens now use the authenticated Neon API rather than sample people, messages, groups, requests, reports, or invitations. The empty Chats view is the empty state of the same screen.

## Implemented

Chat dates, quoted replies, visible-message read receipts and the updated launcher icon are documented in [chat-interactions.md](chat-interactions.md).

- Migrations 003–004 add accounts, active devices, unique connection pairs, conversations, membership periods, invitations, ordered messages, read positions, blocks, reports, delivery events, deletion jobs, short-lived socket tickets, and database-backed request throttles. Existing profiles and preferences remain intact.
- Clerk signatures, issuer, expiry and origin are verified. The backend checks that the session is active, belongs to the caller, and has an approved verified Google email. Approval still comes from administrator-owned Clerk Public metadata; no custom JWT approval claim is configured.
- Activating a newer Clerk session replaces the backend device/session. Older sessions cannot reactivate themselves, read API data, or mutate records. Account and device checks run again inside write transactions. The pilot admits at most 20 approved active accounts.
- Exact-username lookup, requests, acceptance/decline/cancellation, disconnection, and direct conversation creation are persisted. Direct messages require an accepted, unblocked connection. One direct conversation exists per unordered pair.
- Creating a group starts with an empty name and invite selection. The creator is its owner; selected accepted connections receive invitations. Acceptance, membership changes, role changes and capacity are transactional. Members cannot promote themselves; owners can transfer ownership. Owners must transfer ownership before leaving a nonempty group.
- Each membership period starts after the group's current message position. Removed or former members cannot fetch history; rejoining starts a new period. Groups cannot exceed 20 members, including under concurrent invitation acceptance.
- Text messages accept nonblank Unicode up to 4,000 code points, use server sequence positions and 50-message cursor pages, and deduplicate retries by author/retry UUID. Android shows pending work and marks it committed only after the API confirms. Failed messages retain their retry UUID for manual retry.
- A transaction writes the message and recipient delivery events together. Neon dispatches invalidation hints to a per-user Cloudflare Durable Object; clients fetch authorized data again on connect and change. Socket tickets expire after 30 seconds and are consumed once. Sockets expire after 60 seconds and reconnect with backoff. No message content is sent through the coordinator.
- Neon recovery runs every 15 minutes. Delivery jobs have leases and bounded backoff. Push failure and realtime failure cannot roll back committed messages, and push is attempted independently of realtime. Invalid push tokens are removed. Notification taps reauthorize the conversation before navigation. Content previews default off and are a persisted preference.
- Loaded conversations, message history, failed work, profile and drafts are stored under the account in Android's private files. Sign-out, access failure and account replacement clear the app cache. Verified server history replaces cached text and deletion placeholders; cached text cannot extend a new membership period. Clerk's documented experimental resource cache supports offline bootstrap. This still needs physical-phone acceptance testing.
- Blocking cancels direct connections and pending invitations in both directions. Existing shared-group messages remain visible. Reports are persisted and visible only to server-configured operator identities; the operator screen supports review, dismissal and suspension.
- Account deletion disables access immediately and queues retryable cleanup. Cleanup removes profile/preferences/photos/devices, wipes authored text into deletion placeholders and removes report content. An owner's longest-serving eligible remaining admin, otherwise member, succeeds them with deterministic ties. Clerk deletion can retry without reopening the account. Previously displayed notifications, screenshots and offline copies cannot be recalled.
- Requests carry correlation IDs. Operational errors omit message contents, credentials and unnecessary personal details. Authenticated requests are limited to 120/minute per account and messages to 30/minute. Android backups are disabled in the next native build. Server secrets are excluded from EAS archives and checked against the exported Android bundle.

## Environments and deployment

The existing Neon branch named `production` currently serves the **development** Clerk instance and development APK. It is not an isolated pilot environment. Its API remains:

`https://br-calm-frost-a1ndi9sf-api.compute.c-1.ap-southeast-1.aws.neon.tech/`

Development realtime is deployed at `https://nimqulo-realtime-dev.nimqulo-realtime.workers.dev`. The service secret is in ignored local files and server environments. The approved support-account owner is the development operator. No credentials are documented here or placed in the APK.

`realtime/wrangler.jsonc` declares a separate, unconfigured `pilot` Worker environment. EAS `preview` uses `APP_VARIANT=pilot`; `app.config.js` refuses test Clerk keys, the development API URL, missing Firebase configuration, or a service-account JSON supplied as Android public configuration. It does not silently fall back to development.

Before pilot release, create a separate Clerk production instance and Neon pilot branch/project, deploy the backend and coordinator with distinct secrets, and set the preview environment's public Clerk/API values. Preserve invite-only Google access, the strict approval metadata policy, and operator IDs. Do not copy development sessions, QA records, or development push tokens into the pilot.

The local Firebase Android `google-services.json` has been validated for `com.jeeva.nimqulo`; it remains ignored by Git and is included in the EAS native build. The owner uploaded the private FCM V1 key directly to EAS. No private service-account file is required in the application. Development build [f16adc7d-8a44-49e4-bb77-77f564456fa4](https://expo.dev/accounts/justjeevan.01/projects/Triply-ai/builds/f16adc7d-8a44-49e4-bb77-77f564456fa4) succeeded and is installed on Pixel 8. The APK and previous recovery APK are saved under `D:\Nimqulo-builds` because C: ran out of space during download. An OTA JavaScript update cannot add native Firebase configuration. See [Expo's FCM V1 setup](https://docs.expo.dev/push-notifications/fcm-credentials/) for credential maintenance.

## Validation

- `npm test`: 25 passing tests, including authorization, sign-out failure handling, profile/media ownership and message reconciliation.
- `MESSENGER_TEST_HOST=<isolated-direct-host> npm run test:messenger`: migration and 14 passing Postgres tests. The runner refuses the application's database host; fixtures run in a temporary schema on the isolated branch.
- `npm run test:realtime`: 5 passing coordinator tests covering forged/reused tickets, identity scoping, expiry and rejected socket writes.
- `npm run lint`, `npm run typecheck`, `npx expo-doctor`: passed; Expo diagnostics passed 20/20 checks.
- `npm run build` passed: `Android Bundled` (1,983 modules), `Exported: dist`, and `Backend build passed (Node.js 24)`.
- Live checks passed for the deployed API, operator access, one-use Neon ticket to Cloudflare WebSocket, authenticated change notification, and unauthenticated ticket-exchange rejection.
- Live preference persistence and private image upload/download passed; downloaded bytes matched and temporary data was restored/removed.
- Pixel 8 emulator verified real group creation, server-confirmed text delivery, confirmed-session restoration to Chats, offline send failure, offline cold-start restoration of cached history/failed work/draft, and manual retry after reconnection. Wi-Fi and mobile-data settings were restored after testing.
- The Firebase-enabled APK registered an Expo push token in the authenticated device record. A QA delivery event for the owner's private test group went through the deployed backend and Expo/FCM, returned an `ok` receipt, and appeared in Android's notification tray with content previews hidden. A background notification tap opened authorized history. This single-account delivery probe does not replace two-phone incoming-message acceptance.
- Notification opening waits for session/onboarding restoration and a loaded community snapshot. Temporary failures retain the target for Retry; membership denials remain unavailable. Development JavaScript is loaded from Metro, including this startup handling fix.
- **Failed:** after `am kill` leaves the task in Recents, a notification can launch Chats without delivering a notification response to JavaScript. This matches the reproduction in [Expo issue 49254](https://github.com/expo/expo/issues/49254); it is not accepted as working. Warm/background taps passed. No unreviewed native-library patch or launch-mode change was applied.
- QA cleanup verified that online and both offline-retry messages each committed exactly once, then removed only the owner-only test group and its records. The removed conversation's history/draft file is absent from Android's private cache; the real account/profile remain intact and Chats shows its actual empty state.

## Release gates still outstanding

1. Resolve and retest killed-process notification-tap delivery on Android, including the surviving-task scenario above. A native fix requires a new APK and acceptance checks.
2. Separate pilot identity, database, coordinator, secrets and EAS environment. The preview guard intentionally blocks accidental release against development.
3. Two physical Android phones for direct/group delivery, session replacement, unread counts, notification permission denial, reconnect, restart, offline drafts and retries. Emulator tests do not replace these checks.
4. Dependency advisories: the current audit reports 35 transitive/inherited findings (12 moderate, 23 high), including unpatched braces and node-forge advisories. Suggested automatic fixes include incompatible stack changes. No force upgrade was applied; assess exposure and supported upstream fixes before release.
5. Manual acceptance and release. Keep the previous APK and backend archive; apply versioned migrations forward and retain recovery information. No paid upgrade or pilot release has been requested or performed.

Ephemeral typing indicators are wired through the authenticated API and development WebSocket coordinator. They do not persist draft text or create push/outbox events. See [chat interactions](chat-interactions.md) for behavior and validation.
