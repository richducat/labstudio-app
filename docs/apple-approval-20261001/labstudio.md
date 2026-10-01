# Lab Studio Apple approval repair

Recovered release source: richducat/labstudio-app branch codex/labstudio-native-release, commit 42e054b. This branch contains the rejected 1.1 shell build 2026081801. The main branch and standalone SwiftUI project represent older versions and were not used for the replacement release.

Apple's August 20 rejection cited guideline 2.3.8 and a blank/default icon in the Messages app drawer. The 1.1 shell still included Capacitor's placeholder icon. Replaced it with an opaque 1024px Lab Studio branded icon derived from the existing native project icon. Both compiled iPhone and iPad primary-icon plist dictionaries and PNG files were verified. The generated asset preserves the existing branding but is a regenerated rendering, not pixel-identical to the older source.

Build number advanced to 2026100101, marketing version stays 1.1. Capacitor generated resources were restored using npm ci --ignore-scripts and npx cap sync ios. Removed the orphan project reference to an absent app PrivacyInfo.xcprivacy; Capacitor's SDK manifest remains part of its package. No app privacy disclosures were changed. The web application still requires its independent App Store privacy declarations.

Release simulator build passed with Xcode 27.0, generic iOS Simulator, both architectures, signing disabled. Actual Messages drawer runtime verification and signed upload remain outstanding. Build output: /tmp/labstudio-shell-derived/Build/Products/Release-iphonesimulator/App.app. Evidence logs: /tmp/va-doc-audit/labstudio-fixed-build.log and labstudio-archive.log.

Signed device archive succeeded and codesign --verify --deep --strict passed. Apple upload via xcodebuild -exportArchive succeeded October 1 at 14:37 EDT. Apple reported uploaded package processing. This is not App Review approval. Archive retained at /Users/richardducat/Documents/Codex/Release-Artifacts/LabStudio/LabStudio-1.1-2026100101.xcarchive.

Apple processed build 2026100101 as VALID (build id e52efb29-fa0a-4756-a407-d145952ac382). Attached it to version 1.1, updated review notes with the actual verification limits, declared standard exempt encryption, resolved the rejected submission item, and resubmitted. Fresh API reads verified both version and submission WAITING_FOR_REVIEW. Submission: 8de26e8f-c820-40b4-be35-df349b068bd7. Actual App Review approval remains pending.
