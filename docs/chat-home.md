# Chat home

`/home` renders the chat home design. On iOS, `app-tabs.ios.tsx` uses SDK 58's `NativeTabs` from `expo-router/native-tabs`, including Apple's system Liquid Glass on iOS 26+. Android and web resolve `app-tabs.tsx` to the custom `GlassTabs` navigator built with Expo Router's headless tabs.

The Android/web bar floats above the bottom safe area, with a rounded translucent surface, edge reflections, outlined icons, and a spring-animated selection pill. Reduced-motion settings disable that animation. Android uses `expo-blur` with a single `BlurTargetView` around the routed content, rendered before the dock. `dimezisBlurViewSdk31Plus` enables efficient backdrop blur on Android 12+ and uses a translucent fallback on older versions. Development clients built before the blur module was installed also retain a translucent fallback until rebuilt. Web uses CSS-backed Expo blur. This is a glass-style approximation on Android, not Apple's Liquid Glass rendering.

Android and web content reserve space above the floating bar, keeping list rows and the new-conversation button accessible. iOS retains its native tab safe-area handling.

Approval is checked at the shared tabs layout, so direct links to all three tabs remain protected. Every fresh sign-in still starts at Profile Setup for approved users; Confirm opens Chats Home without saving profile data. Unapproved users still see Access Required. iOS tab screens use the `react-native-screens/experimental` bottom safe-area wrapper with automatic tab content insets disabled, ensuring list content and the new-conversation action stay above the system bar without doubled insets. The chat screen continues to handle the top safe area. FlatList's automatic native-tab scroll-to-top/minimization integration is not enabled; the bar remains visible and nontransparent on scroll edges where the platform supports that setting.

The reusable chat screen accepts conversation data and callbacks. It supports case-insensitive search by name or latest message, All/Direct/Groups filters, unread counts, scrolling, and an empty search result. Search in the header focuses the search field. Find People and the new-conversation button open the People tab. Settings retains account details, Edit profile, and Sign out.

There is no conversation service or people-discovery API yet. Real accounts receive an empty conversation list. People currently explains that connections will appear when discovery is available. No messages are sent or fabricated for real accounts.

Development previews:

- `/design-preview/chats?state=empty`
- `/design-preview/chats?state=full`

Both previews use the same AppTabs navigator as the signed-in app, including native tabs on iOS and the floating glass bar on Android/web. People and Settings are separate preview routes. The populated preview contains five reference conversations and portraits cropped from the supplied design. Tapping a row opens a clearly marked sample preview. These fixtures never read or write account data, and the route redirects to `/` in production.

The layout is scaled from the phone reference and centered at a maximum width of 480 on web. The supplied phone frame, status icons, and home indicator are device chrome and are not drawn into the application. Native safe-area insets are respected. Lists remain scrollable on smaller phones and when larger system text is enabled.

Localhost screenshots were compared with normalized crops of both references and refined in multiple passes. Browser verification covers filters, case-insensitive search, focus and clear actions, no results, preview rows, the empty CTA, navigation controls, small/tall/desktop widths, and signed-out route protection. Review artifacts and scripts are in ignored `visual-review/`.

Web uses `web.output: "single"`, the supported client-rendered mode for this authenticated mobile app. SDK 58's server-rendered development path repeatedly failed with an unknown-module error on subsequent page requests, including after a clean restart and with asynchronous routes disabled. Client rendering removes that failing server-rendering path. The app currently has no server/API routes; if an Expo server API is added later, revisit this web output choice. Native rendering and authentication guards are unchanged.

Validation: `npx expo lint`, `npx tsc --noEmit`, and `node visual-review/chats-check.cjs`. After migrating to native tabs, production bundles for Android, iOS, and web exported successfully with `npx expo export --platform all --output-dir visual-review/native-tabs-export`. Native system-bar appearance and safe-area behavior still need a physical-device or simulator check; browser previews show the web fallback.
