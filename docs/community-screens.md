# Groups, invitations, and settings

The Android app uses one authenticated route tree with native Chats, People, and Settings tabs. Detail screens open outside the tab navigator. Clerk sign-in and administrator approval protect these routes; the API independently checks the active session, account status, and authorization. See [app-routes.md](app-routes.md) and [messenger.md](messenger.md) for the current implementation and validation limits.

## Profile and conversations

After a fresh sign-in, approved accounts enter `/profile-setup`; pending accounts enter `/access-required`. Enter a valid display name and username, then Confirm saves them through the authenticated API and opens protected `/home`. Usernames are unique, case-insensitive and immutable during the pilot. An already confirmed session restores to Chats after restart. Optional profile photos use Clerk.

Home displays the account's persisted direct and group conversations. Empty and populated chats are states of the same screen, without separate routes or fabricated conversation history. Created groups and accepted invitations update that list through the backend. Direct conversations require an accepted connection. Conversation screens load persisted, paginated messages and cache loaded history and drafts for offline use.

## Community flows

Create Group is available from People and the Home Groups filter when community data is ready. `/create-group` starts with an empty name and invite selection. A valid name is required; an owner-only group is permitted. Up to 19 eligible accepted connections can be invited. Blocked contacts and existing members are excluded from the invitation editor. Creating a group saves it through the API and opens its details. Group photo uploads are not implemented and their control is disabled.

`/group-details/[id]` shows the actual member roster and roles. Authorized users can edit, invite connections, manage ordinary members, appoint admins, and transfer ownership. A group has at most 20 members. An owner must transfer ownership before leaving while other members remain; a sole owner can leave. Permitted leave failures show an error, and success returns to `/home`. The group's chat opens `/groups/[id]`; direct chats use `/messages/[id]`.

People opens exact-username search, connection requests, user profiles, and `/invitations`. Invitation acceptance/decline is persisted; only acceptance establishes group membership. History access is restricted to the current membership period. Leaving or removal revokes access; rejoining starts a new period.

## Settings and safety

The Settings profile card opens `/profile` to view the current account and returns to Settings; it does not restart onboarding. Settings preferences are persisted through the authenticated API, including notifications and message previews. The appearance preference is stored, but light/dark styling is excluded as requested. Notification preferences do not change Android's OS permission settings.

`/privacy-and-safety` shows blocked users and supports unblocking, selecting a report target, safety guidelines, and account deletion. `/report-user` resolves a supplied user ID and submits a report with the selected reason; missing targets disable submission. Reports are persisted and available to authorized operators through `/moderation`. Deletion disables access immediately and queues retryable cleanup. Support opens `mailto:jeevanofficial1120@gmail.com` after a tap.

Sign Out waits for Clerk readiness and successful session revocation, clears account-scoped caches and navigation, then returns to authentication. Failure keeps the current session screen available for retry; Cancel leaves the session unchanged.

## Development and verification

Development uses the same protected routes and authenticated API as the app. The earlier preview-only route tree and in-memory sample providers were removed. Legacy `*-fixtures` filenames under `src/state` now wrap persisted backend operations; they do not create sample accounts, chats, or invitations.

Historical reference-image comparison captures remain in the ignored `visual-review` directory. Those captures document earlier UI work, not proof of current backend delivery. Current unit, isolated Postgres, coordinator, API and Pixel 8 checks are recorded in [messenger.md](messenger.md), with chat dates, replies, read receipts and typing validation in [chat-interactions.md](chat-interactions.md). Physical two-phone acceptance, the known killed-process notification issue, and pilot release setup remain outstanding there.
