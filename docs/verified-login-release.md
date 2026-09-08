# Verified member login release

The web and native clients now require a single-use email code. Contact-only login, phone-based account linking and unsigned UID authorization are removed from all entry points. Both v1 and production v2 sessions are rejected; newly verified v3 sessions expire after seven days. Existing phone-only members need a verified email linked through a controlled support recovery process, not by knowing a phone number.

Authenticated App Store Connect inspection on September 8, 2026 confirmed the live version is 1.0, build 2026070901. The release branch `codex/labstudio-booking-resubmission` records source commit `42b18c29768213be1cbbb8af1fa914e4bde85bcc` for that build. This remediation incorporates that branch to preserve the seven native tabs, Reaction Lab-only games, retry-safe booking, calendar privacy and best-effort refresh. Its v2 sessions were still issued without verified contact ownership, so v2 must not survive the security rollout.

This patch still requires comparison with the exact archive chosen for the next submission. Preserve any newer intended release changes and validate the app icon in system surfaces, including the Messages drawer, on iPhone and iPad before resubmitting.

## Configuration and rollout

Set DATABASE_URL, a random LABSTUDIO_SESSION_SECRET with at least 32 characters, LABSTUDIO_SMTP_HOST, LABSTUDIO_SMTP_USER, LABSTUDIO_SMTP_PASSWORD and LABSTUDIO_LOGIN_FROM in deployment secrets. LABSTUDIO_SMTP_PORT supports 465 (TLS, default) or 587 (required STARTTLS). Never place secrets in source control. The sender must be configured and its delivery verified using a controlled inbox.

The database role needs CREATE TABLE rights for lab_login_codes and lab_login_throttle. Codes are HMAC-hashed, expire after ten minutes, allow five guesses, are consumed atomically, and are removed after expiry plus one day. Recipient requests are limited to one per minute and five per hour across all workers.

Validate the updated native client against a staging backend, then coordinate backend activation and the iOS update. Old native builds cannot sign in after this security fix. The deployment workflow requires explicit native-release readiness and complete SMTP configuration; it packages all pages, static chunks, runtime dependencies and environment configuration together. It must not silently retain the vulnerable login to support older versions.

## Release evidence still required

- Deliver and use a code in a controlled inbox; check two separate test members, failed codes, logout and deletion.
- Verify existing email-profile mappings and investigate historical access logs. Old contact-only sessions cannot establish that a prior profile email change was legitimate. Do not automatically merge conflicting accounts.
- Validate the native build, select a version/build number newer than App Store Connect, archive, sign, upload and complete Apple review.
- Verify the deployed commit and confirm the live API rejects contact-only requests and unsigned UID cookies. No real customer records should be used as probes.

Local validation: nine regression tests exercise PostgreSQL challenge consumption/throttling, delivery failure, replay, expiry and signed-session authorization. TypeScript, lint and a production Next.js build are also checked. Email is mocked in tests; no customer messages are sent. This document records a proposed release, not a production deployment.
