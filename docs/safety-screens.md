# Safety and account screens

The five supplied references are implemented in `src/components/safety/`, using the four supplied transparent illustrations from `assets/safety/`. Typography uses the existing Inter font and mobile scale. Content scrolls on small screens; the deletion form avoids the keyboard.

## Routes and entry points

| Screen | Development preview | Application route |
| --- | --- | --- |
| Report user | `/design-preview/report-user?id=taylor` | `/report-user` (approved account) |
| Account deletion | `/design-preview/account-deletion` | `/account-deletion` (approved account) |
| Account suspended | `/design-preview/account-suspended` | `/account-suspended` |
| Concurrent session | `/design-preview/concurrent-session` | `/concurrent-session` |
| Offline | `/design-preview/offline` | `/offline` |

User profile reporting opens the new reason-selection screen. Privacy & Safety lets a preview user choose a person before entering it and includes Delete account. The existing profile report callback remains available for other component consumers.

## Behavior and integration limits

- Reporting requires one of six reasons and a confirmation. A success state appears only after the persistence callback returns `true`. Preview reports use the existing in-memory social context; unknown users cannot submit.
- Deletion requires exactly `DELETE` and a second confirmation. The preview callback deliberately performs no account mutation and its completion message states that no account was deleted. Actual deletion remains disabled until an account-data deletion callback is provided; deleting only a Clerk identity would not satisfy the data-removal promises in the reference.
- Suspension support opens `mailto:jeevanofficial1120@gmail.com`. Application sign-in actions use Clerk sign-out before returning to authentication. Development preview actions never change an actual Clerk session.
- Offline Retry returns to the previous application route (or authentication if opened directly); Settings opens Android wireless settings, iOS app settings, or app settings in the browser preview. These are UI routes, not automatic connectivity detection. The reference copy about automatic message delivery describes the intended future messaging behavior; an offline message queue is not implemented.
- Status routes render even before Clerk finishes loading, so an authentication-loading spinner cannot conceal these pages. Protected account routes still require identity and approval.
- Suspension detection and concurrent-session enforcement are not added or inferred from client-editable metadata. Their event sources must navigate to the respective status route when backend/session integration is implemented.
- Existing approval checks, profile placeholders, native tabs and message typography remain unchanged.

## Validation

Five full Android Pixel 8 comparison passes, plus a final report-screen spacing pass, were completed. Screenshots are captured and compared with phone-interior crops of all five references. Comparison artifacts live in the ignored `visual-review/` directory. Emulator size is temporarily adjusted to the reference aspect ratio for comparison, then restored to 1080x2400.

Browser checks cover report selection/confirmation, privacy/profile entry points, exact deletion text, cancellation, safe preview completion without any DELETE request, status navigation, protected routes, 320/480 widths and runtime errors. Native checks cover the same report/deletion interactions and status navigation. Deletion dismisses and blurs the keyboard before confirmation, so cancelling the dialog does not reopen the keyboard over the form action. The existing community-flow regression suite is updated to follow the new full-screen reporting entry.

All browser and native checks above passed. The supplied asset glow, background gradients and platform system chrome still differ from the reference; the result is not claimed pixel-identical.

Passed validation: `npx expo lint`, `npx tsc --noEmit`, `npm test`.
