# Nimqulo — Implementation Plan

## Summary

Build an Android-only messenger for an invite-only pilot of up to 20 adults in India. Prioritize reliable private text conversations, small groups, and clear failure handling within a $0 recurring infrastructure budget.

Retain Expo SDK 58, React Native 0.88, Expo Router native tabs, NativeWind, Clerk Google authentication, Neon/Postgres, and Cloudflare. Distribute signed APKs privately. Implementation is tracked in docs/phase-1.md. Phase 1 uses the subsequently requested Neon Functions backend; light/dark theme implementation is excluded at the user's request.

## 1. Foundation and user experience

Status: implemented and validated, excluding light/dark themes as requested. See [Phase 1 implementation and validation](docs/phase-1.md).

- Keep application routes in `src/app/`; place components, state, networking, and business logic outside the route directory. Keep the authenticated Neon Functions backend in the separate backend/ package in the same repository. Cloudflare realtime coordination remains a later-phase architecture decision.
- Preserve npm and the existing lockfile. Install mobile dependencies through `npx expo install`. Verify exact package versions against SDK 58 documentation and peer dependencies before locking them; treat incompatible NativeWind or Clerk requirements as blockers rather than silently changing the stack.
- Configure Nimqulo branding, an Android application identifier, authentication redirects, notification configuration, and EAS development/preview APK profiles. Keep signing credentials outside the repository.
- Use native **Chats**, **People**, and **Settings** tabs. Open conversations, group details, profiles, invitations, and moderation screens through stack routes.
- Provide Google sign-in, username/display-name setup, optional profile-photo upload, returning-user session restoration, and clear access-denied states.
- After each fresh sign-in, route admin-approved users immediately to profile setup and unapproved users to Access Required. Require the explicit admin-owned approval flag; completing a profile must never grant approval. The current frontend uses Clerk Public metadata `approved: true` until the backend approval service is implemented.
- Use Clerk for profile-image upload and identity. Store application usernames and display names in Neon. Usernames are case-insensitive, unique, 3–24 characters, using letters, numbers, and underscores; keep them immutable during the pilot.
- Support screen-reader labels, scalable text, accessible touch targets, keyboard handling, loading states, and empty/error states. Light/dark appearance is excluded from Phase 1 at the user's request.

## 2. Backend, data, and authorization

- Use the deployed Neon Functions package for authenticated HTTPS APIs, following the later Neon setup request. Cloudflare Workers with SQLite-backed Durable Objects remain the proposed live connection coordinator for Phase 2. Neon remains authoritative for application records and message history.
- Verify Clerk tokens server-side. Require an approved Google email and the account’s active session on API calls and realtime connections.
- Allow one active phone per account. Activating another session replaces the previous backend session and disconnects its live connections.
- Keep development and pilot environments separate, including Clerk instances, Neon databases, Cloudflare resources, and secrets.

Create versioned migrations for:

| Entity | Required behavior |
|---|---|
| Profiles and pilot approvals | Unique Clerk identity and normalized username; approval, suspension, and deletion status |
| Connections and requests | One relationship per user pair; pending, accepted, declined, or cancelled |
| Conversations and memberships | Direct/group type; owner/admin/member roles; joining and leaving boundaries |
| Group invitations | Inviter, recipient, group, and pending/accepted/declined status |
| Messages | Conversation, author, text, server ordering, client-generated retry identifier, deletion placeholder |
| Read positions | Per-user conversation position for unread counts |
| Blocks and reports | Blocking relationships; restricted report evidence and review status |
| Devices and delivery events | Active session, push token, and durable pending notifications/events |

- Enforce uniqueness and membership changes in database transactions. Prevent duplicate direct conversations, duplicate requests, and groups exceeding 20 members under concurrent actions.
- Expose typed interfaces for profiles, exact-username lookup, connections, conversations, paginated messages, read positions, invitations, group administration, blocks, reports, devices, and account deletion.
- Derive acting identity from the verified session. Check authorization on every operation; hiding a screen is insufficient.
- Use consistent validation and error responses for unauthorized, forbidden, conflicting, rate-limited, and temporarily unavailable requests.

## 3. Messaging and lifecycle behavior

- Require an accepted connection before direct messaging. Admins may invite their accepted connections into groups; acceptance establishes membership.
- Allow owners to appoint/demote admins and transfer ownership. Admins manage ordinary members. Owners leaving normally must transfer ownership.
- On owner account deletion, promote the longest-serving remaining admin, otherwise the longest-serving member. Resolve ties deterministically.
- Restrict group history to each membership period. Leaving or removal terminates access; rejoining starts a new visibility period.
- Accept nonblank Unicode text up to 4,000 characters. Use server ordering and cursor pagination.
- Show pending messages immediately. Mark a message sent only after Neon commits it. Preserve failed messages for manual retry, reusing the same retry identifier to prevent duplicates.
- Deliver committed events over authenticated WebSockets. On reconnect, fetch changes from Neon so missed realtime events cannot lose messages.
- Persist message delivery events transactionally with messages. Attempt immediate dispatch and use a scheduled recovery sweep every 15 minutes for interrupted delivery work. Retry transient failures with bounded backoff.
- Keep push delivery independent of message persistence. Use Expo Push Service with Android notification credentials, remove invalid tokens, and open the authorized conversation when tapped.
- Include sender/message previews as selected. Notification denial must leave in-app messaging functional.
- Cache loaded conversations and drafts locally, scoped to the account. Clear local data on sign-out or account replacement; reconcile removals and deletion placeholders on reconnect.

## 4. Safety, operations, and release

- Blocking prevents direct messages, connection requests, and new group invitations in both directions. Explain that existing shared-group messages remain visible.
- Add reporting and an operator-only moderation screen. Restrict operator access through server configuration; support report review and account suspension.
- Account deletion immediately disables application access, then performs retryable cleanup: erase authored text and report excerpts, remove the profile/photo, resolve group ownership, remove memberships/devices, and delete the Clerk account.
- Retain only non-content integrity placeholders and minimal moderation metadata. Do not promise recall of screenshots, previously displayed notifications, or offline copies.
- Apply server-side request throttling, payload limits, and group-size limits. Never ship database credentials or backend secrets in the APK.
- Record structured operational errors, request IDs, delivery failures, and quota-related failures without message contents, tokens, or unnecessary personal data.
- Use free-plan dashboards and logs. Keep paid upgrades disabled; show clear degraded-service states when provider limits prevent operations.
- Release manually after validation. Preserve database migrations and the previous signed APK/backend version for recovery.

## 5. Validation and acceptance

- Run lint, TypeScript checks, and Expo dependency diagnostics before release.
- Test backend authorization, concurrent invitation acceptance, group capacity, ownership succession, history boundaries, blocking, suspension, and account deletion.
- Verify that concurrent retries create exactly one message and that committed messages survive realtime/push failures.
- Test Google sign-in, allowlist rejection, cancelled authentication, profile-photo failure, and replacement of the previous active phone.
- Test on two physical Android phones: direct/group messaging, unread counts, notification navigation, denied notifications, app restart, offline drafts, manual retries, and reconnection.
- Confirm outsiders, former members, and replaced sessions cannot read or subscribe to restricted conversations.
- Release only when these scenarios pass and provider configuration remains within free-plan limits.

## Assumptions and remaining risks

- Nimqulo is provisional; initial searches do not establish trademark, domain, or worldwide name availability.
- NativeWind and Clerk exact package compatibility must be verified before implementation proceeds.
- Profile photos are optional. No group-photo uploads, message attachments, calls, AI, public discovery, payments, or ads in v1.
- No read receipts, typing indicators, or online-status display.
- Standard protection applies; the app is not end-to-end encrypted.
- Provider quotas, notification delivery, APK build availability, and backup retention impose limits on a $0 pilot.
- Photos and voice notes are the likely v2 direction; keep message rendering extensible without building media infrastructure now.
