> Current routing: duplicate preview routes and empty app wrappers were consolidated into one authenticated route tree. See [app-routes.md](app-routes.md). The implementation and validation notes below describe earlier work.

# Groups, invitations, and settings

The new approved app routes are `/create-group`, `/group-details/[id]`, `/invitations`, and `/privacy-and-safety`; Settings remains the third tab. Detail screens sit outside the tabs navigator. The existing Clerk identity and admin approval guard remains in effect. Profile setup is still UI-only.

Create Group is available in People and in the Home Groups filter. Its form supports a group name, square photo picker, eligible member selection, a maximum of 20 selections, and a disabled submit button when name or members are missing. Group Details shows group identity, member count/roles, Message/Add/Edit controls, member options, and a leave confirmation. The group-chat options control opens Group Details; chat typography, avatar sizing, bubble gaps, rounded system notices, and photo-scroll handling are unchanged.

People's Invitations control opens the invitation screen, which separates pending invitations from accepted/declined history. Declining requires confirmation. Settings includes profile editing, notification and appearance preference sheets, Privacy & Safety, support email, About, and a sign-out confirmation. Live sign-out uses Clerk and displays an error if it fails. Privacy includes blocked users, an unblock confirmation, a report form, and safety guidelines. Reports use the existing callback and show success only when their selected reason was recorded.

## Development previews

- `/design-preview/create-group`
- `/design-preview/group-details`
- `/design-preview/invitations`
- `/design-preview/settings`
- `/design-preview/privacy-and-safety`

A shared development-only provider stores groups, membership roles, invitations/history, blocked sample users, and preference selections in memory. Created and accepted groups appear in the same Home conversation list and survive tab navigation. New groups begin with no message history; preview sends still fail explicitly rather than pretending delivery. Refresh resets preview state. The Create Group reference uses its own connected-contact scenario so the existing social preview's pending requests remain disconnected. Other sample status and search/report behavior are preserved.

There is no group, invitation, discovery, reporting, notification delivery, or theme persistence backend yet. Protected group/invitation routes therefore use empty data and disable operations requiring a backend. Appearance and notification choices are local UI selections; they do not change OS settings or implement light-mode styling. The account owner's actual name/photo are used in live Settings. Support opens `mailto:jeevanofficial1120@gmail.com` only after a tap. Settings Sign Out, including in development previews, uses Clerk to end the current client session before returning to authentication. Confirmation waits for Clerk initialization, prevents duplicate requests, and allows retry after a failure. Cancel leaves the session unchanged. Successful sign-out clears the current navigation stack before replacing it with authentication.

## Visual verification

Reference assets were cropped from the five supplied images; UI is implemented with React Native components and SVG decoration. Pixel 8 screenshot comparison captures are stored under the ignored `visual-review/community-*-compare-pass*.png` files. Device resolution is temporarily adjusted to match each reference aspect ratio and restored after captures. Android system chrome and the previously selected glass tabs follow the running device.

The development preview routes render without waiting for Clerk's network initialization; this is restricted to `__DEV__` preview paths. Authentication and approval are still resolved before any protected app screen mounts. Production previews remain redirected by the preview layout.

Five native screenshot comparison passes were reviewed. The final clean captures are `visual-review/community-*-native-pass5.png` and side-by-side `visual-review/community-*-compare-pass5.png`. Native checks covered the system photo picker, member selection, keyboard entry, creation, details/roles/editing/chat navigation, invitation decisions/history, settings/privacy, unblocking, reason-preserving reports, guidelines, About, and sign-out cancellation. Browser checks additionally covered renaming/leaving existing Home groups, persistence across navigation, signed-out route guards, 320/480 px layouts, and popup-auth callback handoff. Lint, typecheck, and the six existing unit tests passed. No live Google sign-in or backend group/message delivery was exercised.


## Settings profile navigation

The profile card opens `/profile` (or `/design-preview/profile`) to view the current user and returns to Settings. This view reuses the existing profile layout without message, connection, block or report actions for yourself. It does not write profile data. `/profile-setup` remains the onboarding route after fresh sign-in.


## Integration review

Production Create Group buttons in Home and People, and Invitations in People, are disabled while their real data/mutation services are absent. Direct production create/invitation routes return to People. Development previews retain their working in-memory callbacks.

Privacy reporting is disabled if there are no selectable people or no report/open-report callback. Production reporting remains unimplemented: there is no person-directory lookup or moderation service to resolve a route ID and record a report. The production ReportRoute back behavior is preserved; the development reporting route continues to resolve targets and record reasons only in preview state.

Group previews resolve an explicit ID, and default to Weekend Crew only when neither ID nor name is supplied. Name-only links preserve the supplied name without guessing a group ID. Unknown groups retain their supplied name and have no borrowed member roster or conversation history. Accepted invitations have unavailable membership rather than inheriting Weekend Crew's members; their member count and editing actions remain unavailable until a roster exists. The preview save operation also rejects editing unknown membership.

### Sign-out workflow

The authentication screen renders while Clerk initializes; protected app screens still wait for identity and approval. The Google sign-in control remains unavailable until the signed-out client is ready. Sign-out unit tests cover delayed revocation, repeated taps, failure/retry, and client readiness.

Validation for the sign-out change: lint, typecheck, and all nine unit tests passed. Browser checks verified Cancel, one actual Clerk signOut SDK call on confirmation, return to authentication, signed-out Home protection, and authentication rendering with Clerk requests blocked. The community browser regression passed. Pixel 8 checks verified Cancel and the authentication destination; Clerk remained uninitialized in the emulator, so live authenticated native revocation and its Back history were not exercised. Captures: `visual-review/sign-out-confirm-native.png` and `visual-review/sign-out-auth-native.png`.

Profile confirmation leads directly to protected `/home`. The current implementation uses persisted account conversations; see [messenger.md](messenger.md) for backend behavior and validation.
