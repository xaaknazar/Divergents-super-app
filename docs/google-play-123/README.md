# Divergents Google Play 123 - Console preparation

- Date: 2026-11-08.
- Scope: closed Alpha only, using the iPhone 123 source. Public production is not authorized.
- iPhone source: `0d3956c2988273c7d4fa0b6f4b57fc7a9a343227`.
- Initial Android build and native audit were completed by the project chat in `codex/android-play-1108`. On 2026-11-08 that chat explicitly released `/private/tmp/divergents-android-play-1108` at `8d535dab91b161536e463aca99864d4434bdb59c` for the next Android preparation stage. No competing build is running.
- Console materials are isolated in `codex/android-console-1108`.
- App: `kz.divergents.app`, Play app ID `4976059887398795768`.
- Closed Alpha ID: `4700596526635703248`.

## Saved in Console

- Existing account-level tester list attached: 16 allowed addresses. Addresses are intentionally not stored in Git. This is not 16 opted-in participants.
- Target country: Kazakhstan. Alpha setup 2/4 complete.
- Feedback URL: `https://divergents-lms.kz/support`.
- No advertisements, no government affiliation, no financial services.
- Health declaration: Activity and Fitness; Nutrition and Weight Management. Evidence: `src/state/FitnessContext.tsx`, `src/data/fitness.ts`, `src/screens/profile/MyFitnessScreen.tsx` (exercise tracking, weight measurements and personal metric goals). No medical-device or clinical claims.
- Category: Education. Public support email and website from the existing support page.
- Russian listing text, icon and feature graphic saved as a draft; Console confirms "Изменения сохранены". Listing cannot be completed until at least two actual Android screenshots are attached.
- Data safety step 2 saved as a draft: collection Yes, email/other authentication and OAuth, existing deletion URL. Encryption and remaining data-purpose answers were not certified without final review.
- Alpha release draft 1 saved with name `1.0.0 (123) - Alpha` and Russian notes. Console confirms the draft is saved; its App Bundle slot is intentionally empty until a corrected candidate is ready.

## In progress and blockers

- Signed Android AAB 123 finished, but is not release-ready. See the candidate checks below. No AAB uploaded to Play and no Google approval or tester rollout claimed.
- Native ELF audit passed: all 27 arm64 libraries have PT_LOAD alignment >=16384, as recorded in `docs/android-123-build-2026-11-08.md` at `8d535dab91b161536e463aca99864d4434bdb59c`. This is not a physical-device or Play acceptance test. Actual Android smoke testing, screenshots, manifest fixes and a corrected rebuild remain.
- IARC agreement requested separately for Divergents; acceptance for PickChick does not cover this app.
- Target audience is awaiting the owner's answer.
- App access requires a verified review account. Credentials belong only in Play, never this document.
- The owner supplied a phone/four-digit review method, but `AuthScreen.tsx` accepts email and a six-digit Clerk code. This discrepancy was raised with the owner; no unusable credentials were submitted and no authentication bypass was added.
- Data safety must be based on current Android code and SDK/server behavior, not copied from PickChick or the old App Store guide.
- Public `/account-delete` returns HTTP 200 and explains account deletion, but its operator footer still contains a literal template. Owner asked for the actual legal identity and publishable address. No fabricated values were submitted.
- Android FCM is not configured. Do not advertise working Android push.
- Account deletion propagation is unverified: mobile deletes Clerk and local data, while the inspected LMS Clerk webhook only handles create/update events. A separate verified deletion workflow is needed to substantiate the public 30-day promise; no real account was deleted during this audit.

## Signing evidence

- Play app-signing SHA-256: `BD:6A:AC:30:0C:3B:29:E3:42:64:6C:12:6D:0F:BE:DF:09:24:B7:BA:DD:42:00:E6:23:07:2E:5C:6C:71:24:D0`.
- Existing EAS upload certificate reported by project chat: `33:2C:83:27:D1:3D:4C:B8:A8:05:7D:67:18:C7:CA:70:71:06:11:EF:85:90:B6:12:2E:87:84:FA:2E:2D:59:DC`.
- Current Play signing page exposes app signing only, no separate upload certificate. These fingerprints are different roles, not evidence of a signing mismatch. Actual AAB acceptance remains to be checked. No key changed.

## Initial Android 123 candidate - not uploaded

- EAS build: `2efff331-7c8b-48bb-b378-e1edd2650fd3`, reported FINISHED by the project chat.
- Android source: `719dd827331d22989b9f0470ff80a006d0b9ca8d`, based on the shared iOS123 source.
- Local artifact: `/Users/xaknazar/divergents-private-backups/2026-11-08/divergents-android123.aab`.
- SHA-256 independently checked here: `4b7db66aa2238461671a59d0500f9847c8d37d76027b9c7e09bb42002c657cb0`.
- Project chat reports bundletool validate PASS, jarsigner verified, duplicate ZIP entries 0; package `kz.divergents.app`, version `1.0.0`/code123, minSdk24, targetSdk36, debuggable=false. Self-signed/timestamp/manifest stream-order signing warnings were recorded by the builder.
- Final manifest lacks `com.google.android.geo.API_KEY`, while app screens use react-native-maps. `app.config.ts` reads `GOOGLE_MAPS_ANDROID_KEY`; a valid existing Android Maps SDK key restricted to `kz.divergents.app` and the Play app-signing certificate is required. No unrestricted key was created, no new billing accepted, and maps were not silently disabled.
- Broad READ_MEDIA_AUDIO/IMAGES/VIDEO and SYSTEM_ALERT_WINDOW permissions remain in the candidate and require minimization or actual justification. FCM is not configured. Native ELF 16KB alignment audit passed for all 27 arm64 libraries; device and Play checks remain.
- Known-defective candidate was not uploaded merely to test signature acceptance. Preserve versionCode123 for a corrected first upload where possible; no signing-key reset is required by the current evidence.
- Relevant versioning reference: https://developer.android.com/studio/publish/versioning . Google Play disallows reusing a versionCode already used for a previous version.

## Draft Russian release notes

```text
Первая версия Divergents для закрытого тестирования на Android.
Обучение, личная библиотека, профиль талантов, челленджи и мероприятия.
Изменения сборки 123: работа с личными книгами, управление мероприятиями и отметки участия.
```

## Graphics

- `graphics/icon-512.png`: existing app icon exported at 512x512.
- `graphics/feature-1024x500.png`: new built-in imagegen banner, exported at 1024x500.
- Prompt: Google Play feature graphic for Divergents education, books and personal growth; reference the existing cobalt icon and white geometric person; navy #234088/cobalt, restrained arcs, clear white title "Divergents" and subtitle "Обучение. Книги. Развитие."; no UI screenshots, devices, invented features, ratings, prices or third-party logos.
- Actual Android screenshots are not yet supplied. Generated artwork is not evidence of the app interface.

## Checks and rollback

- This branch changes documentation and store assets only. `npm run typecheck` passed (exit 0) on 2026-11-08 against the shared 123 source.
- Both graphics were checked: icon 512x512, feature 1024x500, PNG without alpha. Listing text lengths: title 10, short description 74, full description 1094.
- Console settings can be edited before submission. No production release, signing reset or server mutation performed by this Console task.
- For rollback, remove unsubmitted Console changes individually; do not delete or rename the shared tester list.
