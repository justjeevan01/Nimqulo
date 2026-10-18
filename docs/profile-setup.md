> Route cleanup: historical `/design-preview/*` URLs below have been removed. The app now uses the authenticated routes documented in [app-routes.md](app-routes.md).

# Profile setup

`/profile-setup` requires a signed-in, admin-approved account (`user.publicMetadata.approved === true`). Every fresh Google sign-in routes approved users here. Unapproved accounts go to Access Required.

This screen is temporarily UI-only. Display name and username are empty, read-only fields with placeholders. The photo control is decorative; an existing account photo may be displayed. There is no validation, photo selection, Clerk profile update, database write, or saved completion marker. Clerk Username does not need to be enabled for this flow.

**Confirm** immediately replaces this route with `/home`, showing Chats Home. The shared tabs layout checks approval without requiring a saved profile. Back returns to the previous screen when available, or signs out when setup is the first screen.

The development-only `/design-preview/profile-setup` route uses the same placeholders and opens the shared chat Home preview on Confirm, without reading or writing a Clerk account. Production builds redirect this preview route to `/`.

Validate with `npx expo lint`, `npx tsc --noEmit`, and the browser flow check in ignored `visual-review/profile-check.cjs`. These JavaScript-only changes load through Metro without rebuilding the Android APK.
