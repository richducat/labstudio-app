Build 2026070901 is version 1.0 for bundle ID fit.labstudio.app.

Login uses email or phone only; no password or email verification is required for review. Use reviewer+labstudio@labstudio.fit on the login screen, complete onboarding if prompted, then review the native Dash, Book, Games, Coach, Rank, Shop, and Me tabs.

Booking fix for the June 13 Guideline 2.1(a) rejection: the reviewer booking was successfully saved, but an unrelated seven-endpoint refresh displayed an error afterward. This build preserves the successful booking confirmation, refreshes best-effort, and treats an exact retry as the existing booking instead of an error.

In Book, unavailable times are disabled and shared-calendar event titles, locations, and descriptions are never exposed to members. Choose an enabled date and time, tap Book Session, and confirm the green success message and the session under Your Sessions.

Games exposes Reaction Lab only. Rank and leaderboard scoring are restricted to Reaction Lab scores. Toby is positioned above the native tab bar on compact iPhone layouts and falls back to built-in coaching guidance if the external provider is unavailable.

Build 2026070901 passed iPad Air 11-inch class testing on iPadOS 26.5, Xcode static analysis, optimized iPhone/iPad Release builds, Swift tests, web lint/build, and live production reviewer login, booking, exact-retry, refresh, and calendar-privacy checks.

Photos permission is used only for private progress-photo selection. No push, local notifications, location, camera, or device-calendar permission is used. Delete Account is available in Me. Any Stripe checkout is for in-person gym services, facility memberships, or physical products—not digital content. There are no Apple in-app purchases, App Store subscriptions, or ads.
