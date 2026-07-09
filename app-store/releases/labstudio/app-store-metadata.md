# App Store Metadata

## App Information

- Name: Lab Studio
- Subtitle: Training and coaching
- Bundle ID: fit.labstudio.app
- SKU: fit.labstudio.app
- Version: 1.0
- Build: 2026070901
- Primary category: Health & Fitness
- Secondary category: Lifestyle
- App Store Connect Apple ID: 6763787815
- App Store Connect state: Rejected / Unresolved Issues for Guideline 2.1(a) on version 1.0 build 2026061001; fresh authenticated verification completed July 9, 2026
- App Store age rating: 12+
- Marketing URL: https://labstudio.fit
- Support URL: https://app.labstudio.fit/support
- Privacy Policy URL: https://app.labstudio.fit/privacy
- Terms of Use URL: https://app.labstudio.fit/terms

## Promotional Text

Members-only training, nutrition, booking, progress tracking, and Toby coaching for Lab Studio.

## Description

Lab Studio is the members-only companion for training at Lab Studio Fit.

Members can sign in with an email address or phone number, complete their profile, track workouts, log nutrition, review progress photos and strength PRs, book sessions, review habits, and use Toby coaching support built around Lab Studio training knowledge.

Purchases available in the app are for in-person gym services, physical products, or facility-based memberships provided by Lab Studio.

## Keywords

fitness, training, gym, coach, nutrition, workout

## What's New

Booking reliability update: successful reservations now keep their confirmation even if a later dashboard refresh is interrupted, repeated requests are retry-safe, unavailable times cannot be submitted, and calendar availability is displayed more clearly.

## Review Notes

Login uses email or phone only; no password or email verification is required. Use reviewer+labstudio@labstudio.fit, complete onboarding if prompted, then open Book and choose an enabled time. Build 2026070901 fixes the false booking-failure banner from the June 13 review, makes exact retries safe, disables unavailable slots, and keeps shared calendar details private.

## Submission Snapshot

- Release type: MANUAL
- Download price: Free
- iPhone screenshots attached: Yes
- iPad screenshots attached: Yes
- Login required: Yes
- App Store subscriptions present: No
- Ads present: No
- App Privacy updated for this build: Yes
- Export compliance reviewed: Yes

## TestFlight

- Internal group: Studio Crew
- Internal tester: richducat@gmail.com invited
- Public group: Studio Crew
- Public link: https://testflight.apple.com/join/rtpbMJhP
- Public link limit: None
- Build: 2026070901
- Build ID: Apple processing; ID pending
- Internal build state: Uploaded July 9, 2026 at 6:51 PM EDT; Apple processing
- External build state: Not submitted for external Beta App Review for build 2026070901
- Public link build: 2026042401 remains the previously approved external TestFlight build

## Internal Launch Notes

- App Store Connect version state: Rejected / Unresolved Issues for Guideline 2.1(a) on 1.0 (2026061001)
- Candidate build number: 2026070901
- Last uploaded build ID or build number: a9517467-e7a4-4db9-ab06-0f6cde3defd2 / 2026061001
- Native screenshot sources:
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-home.png
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-games.png
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-rank.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-home.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-games.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-rank.png
  - app-store/releases/labstudio/screenshots/native/ipad-pro-13-home.png
  - app-store/releases/labstudio/screenshots/native/ipad-pro-13-games.png
  - app-store/releases/labstudio/screenshots/native/ipad-pro-13-rank.png
- Review submission ID: b56d98ff-c5be-4b8d-bd4e-4acb94a9eb1b
- Latest native upload: 2026-07-09T22:51:07Z for build 2026070901; Apple processing
- Review submitted at: 2026-06-12 for build 2026061001
- Fresh ASC verification result: build 2026061001 is rejected under Guideline 2.1(a) after an error appeared during booking on iPad Air 11-inch (M3), iPadOS 26.5
- Candidate delta: 2026070901 preserves successful write confirmations, makes booking retries idempotent, blocks unavailable-slot submission, protects shared-calendar details, and updates production runtime dependencies
- Verification: Swift tests, Xcode analysis, web lint/build, optimized native builds, signed archive validation, production deploy run 29055606467, and live reviewer booking/idempotency/refresh/privacy tests passed
- App Privacy state: Published on April 25, 2026
- Manual release after approval: Yes
- Reviewer-flow checks to keep current:
  - Confirm https://app.labstudio.fit is serving Namecheap, not Vercel
  - Confirm login, booking, shop checkout handoff, Toby, profile save, progress photo upload, account deletion, and member dashboard from the live native iOS app
