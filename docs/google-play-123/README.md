# Divergents Google Play 123 - Console preparation

- Date: 2026-11-08.
- Scope: closed Alpha only, using the iPhone 123 source. Public production is not authorized.
- iPhone source: `0d3956c2988273c7d4fa0b6f4b57fc7a9a343227`.
- Android build belongs to the project chat and branch `codex/android-play-1108`; do not run a competing build or edit its worktree.
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

## In progress and blockers

- Signed Android AAB 123 is building in the project chat; no upload or Google approval is claimed here.
- Final manifest review, actual Android smoke test and screenshots are still required.
- IARC agreement requested separately for Divergents; acceptance for PickChick does not cover this app.
- Target audience is awaiting the owner's answer.
- App access requires a verified review account. Credentials belong only in Play, never this document.
- Data safety must be based on current Android code and SDK/server behavior, not copied from PickChick or the old App Store guide.
- Public `/account-delete` returns HTTP 200 and explains account deletion, but its operator footer still contains a literal template. Owner asked for the actual legal identity and publishable address. No fabricated values were submitted.
- Android FCM is not configured. Do not advertise working Android push.

## Signing evidence

- Play app-signing SHA-256: `BD:6A:AC:30:0C:3B:29:E3:42:64:6C:12:6D:0F:BE:DF:09:24:B7:BA:DD:42:00:E6:23:07:2E:5C:6C:71:24:D0`.
- Existing EAS upload certificate reported by project chat: `33:2C:83:27:D1:3D:4C:B8:A8:05:7D:67:18:C7:CA:70:71:06:11:EF:85:90:B6:12:2E:87:84:FA:2E:2D:59:DC`.
- Current Play signing page exposes app signing only, no separate upload certificate. These fingerprints are different roles, not evidence of a signing mismatch. Actual AAB acceptance remains to be checked. No key changed.

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
