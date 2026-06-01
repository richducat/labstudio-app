# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: Lab Studio
- Version: 1.0
- Build: 2026053101
- Bundle ID: fit.labstudio.app

## Summary for App Review

Lab Studio is a native SwiftUI members-only fitness app for Lab Studio Fit. Members sign in with email or phone, complete a profile, track workouts, nutrition, progress photos, and training stats, book in-person sessions, play Lab games, review leaderboards, review facility shop/cafe items, and use Toby coaching support.

## Login

- Login required: Yes
- Demo username: reviewer+labstudio@labstudio.fit
- Demo password: No password is required.
- Extra login steps: Enter the demo email on the login screen. Phone number is optional. If onboarding appears, complete the three onboarding steps with review-safe sample details.

## How to test the core flow

1. Launch the app and sign in with reviewer+labstudio@labstudio.fit.
2. Review Dash, Book, Games, Coach, Rank, Shop, and Me from the native tab bar.
3. In Games, start a game round and confirm the score is saved. In Rank, confirm the leaderboard renders.
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
- How to reach the paywall or purchase screen:
  - Open Market.
  - Add shop or cafe items to the cart. Any checkout is for in-person gym services, facility memberships, or physical products from Lab Studio.
- Restore path:
  - Not applicable; there are no Apple in-app purchases or App Store subscriptions in this build.

## Additional reviewer notes

- Verified devices:
  - iPhone 17 Pro simulator on iOS 26.2
  - iPad Pro 13-inch simulator on iOS 26.2
  - Signed Release archive for build 2026053101 using team WN3K69XEP4 and bundle ID fit.labstudio.app
- App Store Connect state:
  - Submitted to App Review and verified as Waiting for Review on May 31, 2026 at 10:12 PM EDT.
  - Native Dash, Games, and Rank screenshots are attached in the iPhone 6.5-inch slot.
  - The selected build contains the final Lab Studio Fit app icon.
- Anything Apple should not misinterpret:
  - Stripe checkout, when enabled, is for in-person fitness services, facility membership, and physical goods. The app does not sell digital content or digital subscriptions.
