# Lab Studio iOS

Native SwiftUI redevelopment of the current Lab Studio member experience. The app keeps the existing black/blue/orange brand system and uses the production Lab Studio API at `https://app.labstudio.fit` for auth, profile, home, booking, workouts, nutrition, progress photos, shop/cafe checkout, account deletion, and Toby coach flows.

## Open in Xcode

1. Open `ios/LabStudioFit/LabStudioFit.xcodeproj` in Xcode.
2. Confirm the target uses Apple Developer Team `WN3K69XEP4`.
3. Confirm the bundle ID is `fit.labstudio.app`.
4. Archive and upload to TestFlight from Xcode Organizer or with `build/LabStudio-uploadOptions.plist`.

## App Store Connect checklist

- Apple Developer Team and signing certificate configured.
- App Store Connect app record created with the same bundle ID.
- Privacy Nutrition Labels completed for account, fitness, purchase, analytics, and coaching data actually collected in production.
- Screenshots captured for required iPhone and iPad sizes.
- In-app payment/booking flows validated against production APIs.
- TestFlight internal group added and build submitted for App Review when ready.

## Validation

The pure Swift `LabStudioFitCore` package validates shared business rules in a lightweight target. Full native validation should use the Xcode project because production flows depend on SwiftUI, URLSession cookie handling, PhotosPicker, and App Store signing.
