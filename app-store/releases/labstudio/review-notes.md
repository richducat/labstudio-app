# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: Lab Studio
- Version: 1.0
- Build: 2026061001
- Bundle ID: fit.labstudio.app

## Summary for App Review

Lab Studio is a native SwiftUI members-only fitness app for Lab Studio Fit. Members sign in with email or phone, complete a profile, track workouts, nutrition, progress photos, and training stats, book in-person sessions, play Reaction Lab, review leaderboards, review facility shop/cafe items, and use Toby coaching support.

Build 2026061001 is the reviewer-flow cleanup release. It keeps the restored Lab Studio visual system, removes the broken duplicate game modes so Reaction Lab is the only active game in Games and Rank, fixes the native bottom navigation chrome so no gap appears below the tab bar on iPhone review devices, hardens the login screen scroll layout for compact iPhone review devices, and replaces the iPad screenshot set with native Dash, Games, and Rank app screens.

## Login

- Login required: Yes
- Demo username: reviewer+labstudio@labstudio.fit
- Demo password: No password is required.
- Extra login steps: Enter the demo email on the login screen. Phone number is optional. If onboarding appears, complete the three onboarding steps with review-safe sample details.

## How to test the core flow

1. Launch the app and sign in with reviewer+labstudio@labstudio.fit.
2. Review Dash, Book, Games, Coach, Rank, Shop, and Me from the native tab bar.
3. In Games, start a Reaction Lab round and confirm the score is saved. In Rank, confirm the Reaction Lab leaderboard renders.
4. In Me, update daily stats or profile details, upload a progress photo if requested, and confirm Delete Account is present. Do not delete the demo account unless Apple needs to validate account deletion.

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
  - iPhone 17 Pro simulator on iOS 26.2
  - iPhone 17 Pro Max simulator on iOS 26.2
  - iPhone 16 Pro simulator on iOS 18.2
  - iPad Pro 13-inch simulator on iOS 26.2
  - iPhone 17 Pro Max simulator on iOS 26.5
  - iPad Pro 13-inch simulator on iOS 26.5
  - Native Swift package tests passed for build 2026061001
  - Local Debug simulator build, install, launch, and login scroll verification passed for build 2026061001 on iPhone 17 Pro Max iOS 26.5
  - Local Debug simulator build, install, launch, and screenshot passed for build 2026061001 on iPad Pro 13-inch iOS 26.5
- App Store Connect state:
  - These notes are for candidate build 2026061001. Build 2026060401 was uploaded to App Store Connect on June 4, 2026 at 9:39 AM EDT and resubmitted to App Review on June 4, 2026 at 9:51 AM EDT. Fresh visible App Store Connect verification on June 10, 2026 showed that submission as Rejected / Unresolved Issues.
  - Previous builds 2026053101, 2026060201, and 2026060401 are superseded; they predate the final login scroll hardening included in build 2026061001.
  - Native Dash, Games, and Rank screenshots are attached in the iPhone 6.5-inch, iPhone 6.7-inch, and 13-inch iPad slots.
  - Candidate build 2026061001 uses the final Lab Studio Fit app icon in the native asset catalog.
- Anything Apple should not misinterpret:
  - Stripe checkout, when enabled, is for in-person fitness services, facility membership, and physical goods. The app does not sell digital content or digital subscriptions.
