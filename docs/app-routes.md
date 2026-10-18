# App routes

The Android app uses one authenticated route tree under `src/app/(app)` and native Chats, People, and Settings tabs. The duplicate `src/app/design-preview` tree and unused `SessionScreen` were removed. Current backend behavior and release gates are documented in [messenger.md](messenger.md).

- `/`: Google authentication; a restored session routes to profile setup or Access Required based on admin approval.
- `/profile-setup`: saves the name and username through the authenticated API to Neon Postgres; successful confirmation opens `/home`.
- `/home`, `/people`, `/settings`: the three tabs.
- `/messages/[id]`, `/groups/[id]`, `/group-details/[id]`: direct and group conversations and group details.
- `/profiles/[id]`, `/profile`: other users and the signed-in account's own profile.
- `/find-people`, `/connection-requests`, `/create-group`, `/invitations`: discovery and community flows.
- `/privacy-and-safety`, `/report-user`, `/account-deletion`: persisted safety flows. Deletion disables access and starts retryable cleanup.
- `/moderation`: operator-only report review and suspension; the backend enforces operator access.
- `/access-required`, `/sso-callback`, `/offline`, `/account-suspended`, `/concurrent-session`: required authentication and status routes.

Home has one `ChatHomeScreen`, populated from the account's persisted conversations. It shows its empty state when that data is empty; there is no separate empty-home route or fabricated placeholder history. Search and filters act on that same data.

The state adapters under `src/state` use the authenticated API for profiles, preferences, community operations and text messaging. Their legacy `*-fixtures` filenames no longer imply sample data. Account-scoped local storage holds loaded history and drafts for offline use. Sign-out revokes the Clerk session, erases the app cache and clears navigation before returning to authentication.

Validation: lint, typecheck, nine unit tests, signed-out browser guards and Google handoff/cancellation, and a production web export passed after consolidation. Native checks verified populated Home, direct/group chats, group details, local group creation, invitations, username search, other-user profiles, connection requests, Settings own profile/privacy, and a reason-preserving local report.
