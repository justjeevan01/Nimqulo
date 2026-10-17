# Direct message screen

The screen lives at `/messages/[id]` under the approved app group, outside the tabs layout so the tab bar is hidden. Chat Home opens this route for direct conversations. Authentication and admin approval still apply.

The reusable `DirectMessageScreen` renders the peer header, day marker, incoming/outgoing message bubbles, timestamps, shared photo viewer, failed-send/retry banner, conversation details, and a multiline composer with a system photo picker. The composer stays above the keyboard; message history scrolls on smaller screens and with larger text. Shared photos open only on taps: movement beyond 8 layout points, cancelled touches, and active/recent history scrolling suppress the viewer. Screen-reader activation remains available.

No conversation backend is present yet. The protected route contains no fabricated history, profile photo, or delivery state and leaves composition unavailable until a send handler is connected. Future backend endpoints must verify conversation membership as well as identity and approval; route parameters are display data only.

The development-only `/design-preview/direct-message` route reproduces the supplied Taylor Kim conversation, including the cropped reference portrait and mountain photo. Direct rows in the populated Chats preview open this screen; group rows open the group chat preview. Drafts and selected attachments exist only in memory. Preview sends and retries deliberately remain failed and make no delivery or account requests. The preview redirects to sign-in in production.

The visual comparison uses actual Pixel 8 emulator screenshots. The supplied phone frame and status/navigation glyphs are device chrome, not app artwork. Comparisons also use a temporary emulator resolution matching the reference aspect ratio; the original Pixel 8 resolution is restored afterward. Comparison images and automation are ignored under `visual-review/`.

Validation: `npx expo lint`, `npx tsc --noEmit`, browser regression checks, and Android checks for navigation, image viewing, keyboard layout, photo-picker cancellation, composer, and failed retry. No native dependencies were added, so the existing development APK loads this screen through Metro.
