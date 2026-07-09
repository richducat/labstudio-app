# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: Lab Studio
- Version: 1.0
- Build: 2026070901
- Bundle ID: fit.labstudio.app

## Summary for App Review

Lab Studio is a native SwiftUI members-only fitness app for Lab Studio Fit. Members sign in with email or phone, complete a profile, track workouts, nutrition, progress photos, and training stats, book in-person sessions, play Reaction Lab, review leaderboards, review facility shop/cafe items, and use Toby coaching support.

Build 2026070901 fixes the Guideline 2.1(a) booking issue reported on June 13, 2026. Database evidence confirms the reviewer's Intro Assessment was successfully saved at 12:07:27 AM EDT. The app then refreshed seven unrelated dashboard endpoints and displayed a refresh error as if booking had failed. This build preserves the successful confirmation, refreshes best-effort, and treats an exact retry as the existing reservation instead of an error.

The release also disables unavailable times before submission, hides all shared-calendar titles, locations, and descriptions from members, and keeps the prior native scrolling, screenshot, bottom-navigation, and Reaction Lab fixes.

## Login

- Login required: Yes
- Demo username: reviewer+labstudio@labstudio.fit
- Demo password: No password is required.
- Extra login steps: Enter the demo email on the login screen. Phone number is optional. If onboarding appears, complete the three onboarding steps with review-safe sample details.

## How to test the core flow

1. Launch the app and sign in with reviewer+labstudio@labstudio.fit.
2. Open Book, choose an enabled date and time, and tap Book Session. A green confirmation appears and the session is listed under Your Sessions. Unavailable times are disabled.
3. Review Dash, Games, Coach, Rank, Shop, and Me from the native tab bar.
4. In Games, start a Reaction Lab round and confirm the score is saved. In Rank, confirm the Reaction Lab leaderboard renders.
5. In Me, update daily stats or profile details, upload a progress photo if requested, and confirm Delete Account is present. Do not delete the demo account unless Apple needs to validate account deletion.

## Permissions and background behavior

- Notifications used: No. Why: no push or local notification flow is enabled in this build.
- Calendar used: No device calendar permission. Why: booking availability is fetched from a server-side shared calendar feed.
- Photos used: Yes. Why: users can select a progress photo from their library and upload it to their private member profile.
- Camera used: No native camera permission. Why: this build does not request camera access.
- Location used: No. Why: no location features are enabled.

## Monetization

- Ads present: No
- In-app purchases present: No Apple IAP
- Subscription present: No App Store subscription
- How to reach the purchase screen:
  - Open Shop.
  - Add shop or cafe items to the cart. Any checkout is for in-person gym services, facility memberships, or physical products from Lab Studio.
- Restore path:
  - Not applicable; there are no Apple in-app purchases or App Store subscriptions in this build.

## Additional reviewer notes

- Verified devices:
  - iPad Air 11-inch (M4) simulator on iPadOS 26.5, matching the rejected iPad Air 11-inch device class and OS
  - iPhone 17 Pro simulator on iOS 26.2
  - iPhone 17 Pro Max simulator on iOS 26.2
  - iPhone 16 Pro simulator on iOS 18.2
  - iPad Pro 13-inch simulator on iOS 26.2
  - iPhone 17 Pro Max simulator on iOS 26.5
  - iPad Pro 13-inch simulator on iOS 26.5
  - Native Swift package tests passed for build 2026070901
  - Local Debug simulator build passed for build 2026070901 on iPad Air 11-inch iPadOS 26.5
  - Reviewer login, booking, exact retry, and post-booking home refresh returned HTTP 200 in release-candidate integration testing
  - Web lint, TypeScript, and the Next.js 16.2.10 production build passed
- App Store Connect state:
  - These notes are for build 2026070901. Build 2026061001 was rejected under Guideline 2.1(a) on June 13, 2026 after a successful booking was followed by a misleading refresh error.
  - Previous builds 2026053101, 2026060201, 2026060401, and 2026061001 are superseded.
  - Native Dash, Games, and Rank screenshots are attached in the iPhone 6.5-inch, iPhone 6.7-inch, and 13-inch iPad slots.
  - Build 2026070901 uses the final Lab Studio Fit app icon in the native asset catalog.
- Anything Apple should not misinterpret:
  - Stripe checkout, when enabled, is for in-person fitness services, facility membership, and physical goods. The app does not sell digital content or digital subscriptions.
