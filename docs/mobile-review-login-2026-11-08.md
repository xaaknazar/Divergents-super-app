# Mobile reviewer sign-in - 2026-11-08

## Scope and status

- Owner requested a separate Clerk email/password account for mobile store review.
- Base: Android/iOS build 123 source plus Android permission fix 76b0a74. Branch: codex/mobile-review-login-1108.
- AuthScreen now offers optional password sign-in through the installed Clerk Core 2 SDK. Default email OTP, OTP registration and SSO remain available.
- This is shared mobile source for a future build. Existing iOS/TestFlight and the initial Android AAB 123 were not changed or replaced.
- Follow-up: after the owner's confirmation, created the ordinary Divergents Review user in the existing production Clerk application. The profile visibly confirms account creation and its primary verified email. No password has been entered or saved.
- No production Clerk authentication settings have been changed. No Play credentials saved, release uploaded, or rollout started.

## Implementation

- Sign-in calls Clerk signIn.create with the entered identifier and password. Only status complete with a non-empty createdSessionId is activated.
- Incorrect passwords do not create accounts. Extra verification, password reset requirements or missing sessions stay unauthenticated and show an email-code/support option.
- Password input is secure by default, supports password autofill and a labelled 48-point visibility control. Password is cleared after every attempt and when switching authentication methods.
- Pending requests disable changes to account/method; a synchronous guard prevents duplicate password submissions.
- No special reviewer bypass, hardcoded account, role grant, stored password, or raw Clerk error logging.

## Clerk setup still required

- Correct existing application: Divergents - Learning Management System, Production. Email sign-up, email sign-in and email-code verification are enabled.
- Observed Password settings: Sign-up with password OFF and Add password to account OFF. Do not enable mandatory password registration: the existing signup flow is passwordless.
- A distinct reviewer account now exists at an owner-approved address. Its profile lists Password under Disabled fields; no password editor is available yet. No organization membership or privileged metadata was assigned, and Ignore access restrictions remained unchecked during creation.
- Password settings were inspected again: Add password to account is OFF. Enabling it is an application-wide optional-enrollment change, not a switch restricted to this reviewer. Obtain confirmation of that concrete scope before saving it; preserve OTP registration and keep Sign-up with password OFF.
- The owner must enter and submit the new password personally in Clerk because browser credential changes require handoff. Store the credential outside Git and enter it directly in the Play App access form. Do not turn on global Test mode or disable authentication safeguards.
- No credentials, real user identifiers or signing secrets belong in this report, tests, logs or project-chat coordination.

## Validation

- TypeScript: npm run typecheck passed.
- AuthScreen component tests: npm test -- --watchman=false src/screens/__tests__/AuthScreen.test.tsx, 11 tests passed.
- Tests cover default OTP, complete session activation, wrong/unknown provider errors, incomplete sessions, secret clearing, passwordless registration, duplicate submissions and failed session activation.
- Provider calls in component tests use mocks and synthetic example.invalid data. They do not prove an actual production login.
- Actual reviewer login on Android, visual/device verification, account content/access and Google Play App access remain pending.
- Corrected AAB rebuild is still required after account setup and resolution of the separately documented Android Maps configuration blocker.

## Continue and rollback

1. Resolve optional password enrollment and let the owner set the dedicated account's password in Clerk without granting administrative access.
2. Verify actual login and ordinary review content with the rebuilt Android app. Enter its credentials only in store review fields.
3. Complete the remaining closed-test prerequisites. Production publication is not authorized.
- Rollback of this source change: revert its commit. Existing APK/AAB/iOS releases are unaffected until a new build is distributed.

## References

- [Clerk Core 2 email/password flow](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-password)
- [Clerk authentication settings](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options)
- [Production testing guidance](https://clerk.com/docs/guides/development/testing/test-against-production)
