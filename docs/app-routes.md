# App routes

The Android app uses one authenticated route tree under `src/app/(app)` and native Chats, People, and Settings tabs. Current backend behavior and release gates are documented in [messenger.md](messenger.md).

- `/`: Google authentication; a restored session routes to profile setup or Access Required based on admin approval.
- `/profile-setup`: saves the name and username through the authenticated API to Neon Postgres; successful confirmation opens `/home`.
- `/home`, `/people`, `/settings`: the three tabs.
- `/messages/[id]`, `/groups/[id]`, `/group-details/[id]`: direct and group conversations and group details.
- `/profiles/[id]`, `/profile`: other users and the signed-in account's own profile.
- `/find-people`, `/connection-requests`, `/create-group`, `/invitations`: discovery and community flows.
- `/privacy-and-safety`, `/report-user`, `/account-deletion`: persisted safety flows. Deletion disables access and starts retryable cleanup.
- `/moderation`: operator-only account approval, report review, and suspension; the Settings button is hidden from other users, and the backend enforces operator access.
- `/access-required`, `/offline`, `/account-suspended`, `/concurrent-session`: required authentication and status routes.

Home has one `ChatHomeScreen`, populated from the account's persisted conversations. It shows its empty state when that data is empty; there is no separate empty-home route or fabricated placeholder history. Search and filters act on that same data.

The state adapters under `src/state` use the authenticated API for profiles, preferences, community operations and text/photo messaging. Their legacy `*-fixtures` filenames no longer imply sample data. Account-scoped local storage holds loaded history and drafts for offline use. Sign-out revokes the backend phone binding and ends local Firebase sign-in, erases the app cache and clears navigation before returning to authentication.

Current validation and the final APK status are recorded in [release.md](release.md). Earlier preview/development checks do not establish acceptance of the Firebase release build.
