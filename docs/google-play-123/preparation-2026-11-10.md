# Android closed testing — preparation, 2026-11-10

Status: NOT submitted, NOT available to testers. Closed Alpha only; no production rollout. Main working copy and iOS build number remain unchanged.

## Owner follow-up, November 10

- Owner selected Google Maps with the ordinary no-map-ID map, rather than migrating providers. Source search found no `googleMapId`, `mapId`, or Street View usage in `src`. Google still requires a billing-enabled project; selection/attachment of the billing account has not been verified. The browser controller was unavailable during the follow-up, so no Google Cloud changes were made.
- Owner reports the reviewer password has been set. This supersedes the pending password-entry step below, but is not independent proof of a successful clean-device login. Device Trust remains a separate gate.
- Owner supplied and confirmed the public operator details: **ИП Tynys Tech**, identification number **010603550366**, **Казахстан, г. Алматы, ул. Розыбакиева, 181а**. These are ready for the policy operator block; do not invent a postal code or claim the live website has been updated.
- The matching official arm64 emulator archive finished downloading, its SHA-1 matched Google's repository metadata, and it was extracted separately under the private artifacts directory. Existing installed SDK was not replaced. Android smoke tests/screenshots are still pending.

Google Maps pricing checked November 10: https://developers.google.com/maps/billing-and-pricing/pricing lists Maps SDK unlimited free usage. Map loads with map IDs and Street View have separate billing. Billing-account enablement is required even for the no-map-ID SDK: https://developers.google.com/maps/documentation/android-sdk/usage-and-billing.

## Source and checks

- Isolated worktree `/Users/xaknazar/divergents-android-closed-test-1110`, branch `codex/android-closed-test-1110`, based on `bf1ed2a`. Android versionCode remains 123 because the previous candidate was not uploaded.
- Existing permission minimization `76b0a74` is included.
- Owner explicitly approved a separate ordinary password reviewer account on November 10. Restored optional Clerk password sign-in from `ad9fb71` without a bypass, hardcoded reviewer identity, or admin privileges. Email-code is default; registration remains email-code-only.
- Passwords are cleared after submission/method changes, never logged. Incomplete sessions including `needs_client_trust` are not activated.
- Added an Android production build gate for missing `GOOGLE_MAPS_ANDROID_KEY`. It leaves iOS and development builds unaffected. The guard checks presence, not validity or restrictions; the final manifest and map still require validation.
- Typecheck passed. Full suite after implementation: 158 suites, 1326 tests passed. A subsequent additional Device Trust case plus the build guard passed in the targeted run: 2 suites, 16 tests. Full run printed an open-handle warning; assertions passed, but that warning is retained as a limitation.
- `npm run release:check`: live production protocol v2 ready, read-only check.
- `git diff --check` passed before documentation commit.

## Verified external state / remaining gates

1. Google Play: Divergents draft, setup 7/11, zero opted-in testers. App access, audience, Data safety, listing/screenshots remain unfinished. Existing list has 16 allowed emails; owner will send final 16–17 addresses. Listing membership is not opt-in participation.
2. EAS production environment has no variables. The old AAB lacks a Maps API key and still has removed broad permissions; do not upload it.
3. Google Cloud project `divergents-lms`: Maps SDK for Android was not enabled. Starting enablement led to a required billing-account selection. No billing account selected/assigned by the agent. Owner handoff is open. Existing general API key is unrestricted and was not copied into the app or changed. Create/configure a separate Android-restricted key only after billing resolution; verify package and the Play app-signing SHA-1 (not SHA-256). Separate local-test signing restrictions are required if needed.
4. Clerk production: owner-approved **Add password to account** saved enabled, **Sign-up with password** remains disabled. Opened **Set password** for existing ordinary `Divergents Review`; no password entered by the agent. Owner must enter/confirm/save it. No password-check bypass or sign-out-all was selected.
5. Clerk Device Trust is enabled and can require an email verification on a new device even after a valid password. It was NOT disabled. Reviewer access is not complete until a real clean-device login succeeds; do not promise that a password alone resolves review access. No reusable review credentials were entered into Play.
6. Live `/privacy` still contains operator/BIN/address placeholders and manual-only steps wording. Asked owner for public operator details. Existing deletion/processor questions in `data-safety-audit.md` remain unresolved; no false final Data safety declaration saved.
7. Actual Android screenshots and device smoke tests remain pending. Installed emulator is x86_64 on an arm64 Mac; created a dedicated arm64 AVD and started obtaining the matching official emulator. No fabricated screenshots used.
8. Android FCM configuration/delivery remains unverified.

## Local evidence

- Private artifacts: `/Users/xaknazar/divergents-private-backups/2026-11-10/android-closed-test/`.
- `maps-billing-handoff.jpg` shows the Google Cloud billing-account gate.
- `reviewer-password-handoff.jpg` shows the empty reviewer password form.
- `android123-screenshot-only.apks` is an unsigned extraction of the OLD candidate for exploratory local use only. It is not installable as-is, not a new build, and not for upload/distribution.
- Logs `/tmp/divergents-android-1110-typecheck.log`, `divergents-android-1110-jest-final.log`, `divergents-android-1110-targeted-final.log`.
- Test invitation draft: `tester-instructions.ru.md`. No tester emails or secrets committed.

## Next steps

Resolve owner handoffs; configure restricted Maps key in EAS; confirm independent reviewer login; finish truthful app-content forms/privacy; build corrected AAB; validate signing/version/permissions/16 KB native alignment; smoke-test Android and capture actual screens; upload to closed Alpha and submit for review. Only then share Play opt-in link with the finalized tester list. Production requires a separate later decision.
