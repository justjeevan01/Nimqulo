# Profile setup

`/profile-setup` requires a signed-in, administrator-approved Google account. Each fresh Clerk session enters this screen immediately; pending accounts enter Access Required. Confirm persists profile data through the authenticated API, then opens protected `/home` directly.

Display names and unique, case-insensitive usernames are stored in Neon Postgres. Usernames use 3–24 letters, digits or underscores and remain immutable during the pilot. Optional photo selection/upload uses Clerk. Validation, busy states, upload errors and username conflicts are displayed without granting approval.

A successful confirmation is remembered only for that Clerk session. Restarting a confirmed Android session restores Chats; a fresh sign-in still reaches setup. Previously loaded data and drafts can be restored offline through account-scoped app storage and Clerk's resource cache. API requests always undergo server authorization. Back from incomplete setup uses shared sign-out; editing an existing profile can return to the preceding screen.

There is no design-preview route or alternate chat-home route. See [messenger.md](messenger.md) for current implementation, validation evidence and pilot release gates.
