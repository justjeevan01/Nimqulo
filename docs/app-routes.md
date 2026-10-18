# App routes

The app uses one authenticated route tree under `src/app/(app)`. The duplicate `src/app/design-preview` tree and unused `SessionScreen` were removed. Both platforms use the same Home, People, and Settings destinations; iOS keeps native tabs and Android keeps the existing glass tabs.

- `/`: Google authentication; a restored session routes to profile setup or Access Required based on admin approval.
- `/profile-setup`: saves the name and username through the authenticated API to Neon Postgres; successful confirmation opens `/home`.
- `/home`, `/people`, `/settings`: the three tabs.
- `/messages/[id]`, `/groups/[id]`, `/group-details/[id]`: direct and group conversations and group details.
- `/profiles/[id]`, `/profile`: other users and the signed-in account's own profile.
- `/find-people`, `/connection-requests`, `/create-group`, `/invitations`: discovery and community flows.
- `/privacy-and-safety`, `/report-user`, `/account-deletion`: safety flows. Account deletion remains unavailable without a real deletion operation.
- `/access-required`, `/sso-callback`, `/offline`, `/account-suspended`, `/concurrent-session`: required authentication and status routes.

Home has one `ChatHomeScreen`. It starts with the existing placeholder conversations and shows its empty state when its conversation data is empty; there is no separate empty-home route. Search and filters act on that same data.

Temporary social/community fixtures live under `src/state` and are mounted inside the approved app layout. Group creation, invitations, connections, and reports are local UI interactions and reset when that layout unmounts; message delivery is not connected. Profile data and preferences are persisted through the authenticated API to Neon Postgres. Settings and the own-profile route use the saved profile alongside the Clerk identity. Sign-out revokes the Clerk session and clears navigation before returning to authentication.

Validation: lint, typecheck, nine unit tests, signed-out browser guards and Google handoff/cancellation, and a production web export passed after consolidation. Native checks verified populated Home, direct/group chats, group details, local group creation, invitations, username search, other-user profiles, connection requests, Settings own profile/privacy, and a reason-preserving local report.
