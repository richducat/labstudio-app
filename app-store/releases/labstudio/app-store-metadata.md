# App Store Metadata

## App Information

- Name: Lab Studio
- Subtitle: Training and coaching
- Bundle ID: fit.labstudio.app
- SKU: fit.labstudio.app
- Version: 1.0
- Build: 2026061001
- Primary category: Health & Fitness
- Secondary category: Lifestyle
- App Store Connect Apple ID: 6763787815
- App Store Connect state: Historical June 4 receipt showed Waiting for Review on build 2026060401; fresh June 10 ASC state was not verified
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

Games cleanup for the native SwiftUI release: Reaction Lab is now the only active Lab game, with broken duplicate game modes removed from the app and leaderboard scoring. This build also fixes the bottom navigation chrome on iPhone review devices.

## Review Notes

Login uses email or phone only; no password or email verification is required. Use reviewer+labstudio@labstudio.fit, complete onboarding if prompted, and review the native Dash, Book, Games, Coach, Rank, Shop, and Me tabs. Games now exposes Reaction Lab only; Rank compares Reaction Lab scores. The iPhone bottom navigation chrome has been verified without a gap below the tab bar.

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
- Build: 2026061001
- Build ID: Not uploaded yet
- Internal build state: Local release candidate pending archive/upload approval
- External build state: Not submitted for external Beta App Review for build 2026061001
- Public link build: 2026042401 remains the previously approved external TestFlight build

## Internal Launch Notes

- App Store Connect version state: Historical June 4 receipt showed Waiting for Review
- Candidate build number: 2026061001
- Last uploaded build ID or build number: b7a642f4-56e7-4db7-9bff-c70a5c1c7e94 / 2026060401
- Native screenshot sources:
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-home.png
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-games.png
  - app-store/releases/labstudio/screenshots/native/asc/iphone-6-5-rank.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-home.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-games.png
  - app-store/releases/labstudio/screenshots/native/iphone-17-pro-max-rank.png
  - app-store/releases/labstudio/screenshots/native/ipad-pro-13-login.png
- Review submission ID: b56d98ff-c5be-4b8d-bd4e-4acb94a9eb1b
- Latest native upload: 2026-06-04T13:39:38Z for build 2026060401
- Review submitted at: 2026-06-04T13:51:32.771Z for build 2026060401
- Last direct ASC verification receipt: output/app-store-connect/labstudio-hydrated-resubmit-2026060401.json on 2026-06-04
- Fresh ASC verification gap: 2026-06-10 recheck failed because the asc CLI was unauthenticated and Chrome redirected to login
- Candidate delta: 2026061001 includes the 2026-06-10 login scroll hardening in RootShellView.swift; archive, upload, build selection, screenshot edits, and submit-for-review still require EB28 approvals
- Local verification: iPhone 17 Pro Max iOS 26.5 build/install/launch and scroll verification passed; iPad Pro 13-inch iOS 26.5 build/install/launch screenshot passed; live app.labstudio.fit public/API smoke passed
- App Privacy state: Published on April 25, 2026
- Manual release after approval: Yes
- Reviewer-flow checks to keep current:
  - Confirm https://app.labstudio.fit is serving Namecheap, not Vercel
  - Confirm login, booking, shop checkout handoff, Toby, profile save, progress photo upload, account deletion, and member dashboard from the live native iOS app
