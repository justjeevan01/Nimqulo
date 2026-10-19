# Messenger implementation and validation

Nimqulo is Android-only. Home, People, groups, requests, invitations and safety flows use the authenticated Neon API. The empty Chats view is the empty state of the same Home screen; authenticated accounts are not populated with fabricated conversations.

## Persisted behavior

- Accepted connections permit direct conversations. Exact username lookup, requests, cancellation, removal and bilateral blocking are enforced by the server.
- Group invitations require acceptance. Current membership periods bound visible history; leaving/removal and later rejoining do not restore earlier messages or photos. Roles, ownership transfer and the 20-member limit are enforced transactionally.
- Ordered messages use a unique sender/retry identifier. Replies are conversation-scoped and hide unavailable original text. Read positions advance monotonically from visible incoming messages. Dates and read receipts share the direct/group presentation.
- Direct and group chats support JPEG, PNG and WebP photos up to 5 MB, with optional captions. Private uploads are bound to uploader, conversation and retry identifier. Retrying the same upload/message does not create duplicates; changing its content or borrowing another person's photo is rejected. Photo-only messages and replies to photos are supported.
- Photo history stores IDs; fresh 15-minute signed URLs are requested only after access checks. Unauthorized users, unaccepted invitees, blocked direct contacts and removed members cannot resolve them. Account deletion removes authored photos; abandoned/deleted-message uploads are collected after 24 hours.
- Local messages/drafts/photos stay in Android's account-private directory. Failed sends retain the photo and retry identifier across restarts. Signing out or losing protected access clears the namespace. Scrolling a photo does not open it.
- Cloudflare sends authenticated invalidations and ephemeral typing events. Draft text is not persisted or included in typing/push jobs. Persisted messages survive coordinator outages; recovery does not duplicate committed content.
- Push delivery is separate from message persistence. Preferences and Android permission are respected; previews default off and invalid tokens are removed. The owner explicitly waived further notification-to-chat navigation work for this release.
- Reports, operator review/suspension, blocking and account deletion are persisted. Deletion immediately blocks access, wipes authored content and report text, resolves ownership, and retries provider/storage cleanup. It cannot recall screenshots, displayed notifications or copies held by recipients.

## Authentication and deployment

Firebase Google authentication uses administrator-owned custom approval claims and server checks. A SecureStore login nonce plus verified authentication time binds the active phone. Token refresh does not replace the session; sign-out revokes it. A simultaneous same-second login cannot reuse the active binding.

The separate release Neon branch is `pilot` (`br-square-feather-a14064tt`) with an authenticated API and private storage. Its coordinator is `nimqulo-realtime-pilot`. The branch named `production` (`br-calm-frost-a1ndi9sf`) is the older development environment. Release was created schema-only; no development users, device tokens or chats were copied. Database/storage/coordinator credentials are distinct.

The EAS `release` profile creates the phone APK; `release-check` creates an emulator verification APK. Both use the release API. The app configuration rejects the development API, missing Firebase Google configuration and a private key passed as public Android configuration. See [authentication.md](authentication.md), [neon-setup.md](neon-setup.md) and [release.md](release.md).

## Validation boundaries

The isolated Postgres suite currently passes 20 tests covering migrations, authorization, concurrent retries/invitations, membership history, image ownership, HTTP upload limits, sign-out/replacement, operator-only account approval/capacity, moderation, deletion and outage recovery. Five coordinator tests pass. Unit tests cover access routing, provider verification/policy, client errors, reply/read/typing presentation and local reconciliation.

Live photo checks against the development API verified authenticated upload, repeated upload/send, persisted history, identical downloaded bytes and anonymous storage denial. The owner-only QA group, messages and objects were removed. Release checks reject anonymous, forged and genuine non-Google Firebase sessions; the temporary Firebase test identity was deleted. Its health endpoint responds successfully.

Earlier Android builds verified persisted group creation, offline history/drafts, failed sends and manual retries. Those results do not replace native Firebase/photo acceptance on the new APK. The earlier notification integration build also passed warm and killed-process notification tests; no further notification navigation work is required by the owner.

Two physical Android phones are still needed to verify incoming direct/group messages, unread counts, read receipts, typing, replacement, permission denial and reconnect behavior on distinct devices. Emulator and isolated database checks do not substitute for that acceptance. Dependency advisories are recorded in the release notes; no force downgrade is used to hide them.
