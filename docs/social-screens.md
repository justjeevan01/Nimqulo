# Group chat and People screens

The approved app routes are `/people`, `/find-people`, `/connection-requests`, `/profiles/[id]`, and `/groups/[id]`. The four detail screens live outside the tabs navigator. Authentication and the existing admin approval guard remain required. No packages or native rebuilds were added.

People uses the existing platform tab navigation: native iOS tabs and the previously selected floating glass bar on Android/web. It supports connections, requests navigation, invitations empty state, profile rows, and per-person options. Search accepts only a complete username, ignoring case and an optional leading `@`. Requests displays incoming and outgoing sections; the section controls jump to the relevant section. Profile includes message, connection status, shared groups, removal/block confirmations, and a report dialog.

Group chat uses the same message bubble renderer, 16.5 px body text, 11.5 px timestamps, 55 px header avatar, 19 px title, bubble padding/radii, photo sizing, and composer dimensions as direct messages. Group-specific sender portraits/names and system events remain in the history, which scrolls rather than shrinking contents to fit. Group chat reuses the direct-message composer, picker, failed-send handling, keyboard avoidance, and shared-photo viewer. Sender portraits and the member menu open profiles. System events and photo messages have separate layouts. Dragging over a photo or scrolling history cancels photo opening; a deliberate tap or accessibility activation opens the viewer.

There is no people, connections, reporting, or conversation backend yet. Protected routes show empty data and leave backend-dependent controls unavailable. Connecting a backend must enforce identity, approval, membership, and blocked-user restrictions on the server. Route parameters are display data only.

## Development previews

- `/design-preview/group-chat`
- `/design-preview/people`
- `/design-preview/username-search`
- `/design-preview/connection-requests`
- `/design-preview/user-profile`

These routes reproduce the supplied populated references using local assets cropped from those references. A shared in-memory provider supports requesting, accepting, declining, cancelling, removing, blocking, and reporting for design review. Refresh resets the state; no account or database writes occur. Reports explicitly say they are saved for the preview, and preview message delivery deliberately fails. Reference inconsistencies in portraits/shared-group counts are retained per screen. The shared preview layout redirects to sign-in outside development builds.

## Verification

Six screenshot/comparison passes were captured on the Pixel 8 emulator. Captures temporarily matched each reference aspect ratio, then restored the original emulator resolution. Comparisons and native screenshots are in the ignored `visual-review/social-*-pass6.png` files. Android status/navigation chrome and the existing glass tab bar intentionally follow the running platform.

Browser verification covers exact and partial searches, request counts/actions, profile options, message/group/member navigation, confirmation dismissal, block/unblock/report, protected route redirects, and 320/480 px layouts. Native checks cover the connected flow, photo gestures, and keyboard composition. Run `npx expo lint` and `npx tsc --noEmit` after changes.

The subsequent size-consistency update was checked on Pixel 8: both screens have identical header avatar/title bounds, navigation-button bounds, and send/attachment button dimensions. Browser computed-style checks also confirmed matching body typography, bubble padding/radii, and composer typography/position. The sizing snapshots are `visual-review/direct-message-shared-sizing-native.png` and `visual-review/group-chat-shared-sizing-native.png`. These supersede the compact group presentation in the earlier reference comparison captures.
