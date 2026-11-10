# Mobile reviewer sign-in - 2026-11-08

> Update 2026-11-10: the owner explicitly approved a separate reviewer password account. Optional password sign-in has been restored in `codex/android-closed-test-1110`; email-code remains the default and registration stays passwordless. See `docs/google-play-123/preparation-2026-11-10.md` for current blockers. The following November 8 decision is historical.

## Current decision and status

- Owner explicitly chose "Оставить только вход по коду" when asked to enable Add password to account in production Clerk. This supersedes the earlier password-account request.
- The optional password UI and sign-in handler introduced in ad9fb71 have been removed from codex/mobile-review-login-1108. AuthScreen uses the previous email-code sign-in and registration flows; existing Google/Apple SSO is unchanged.
- The only AuthScreen difference from build 123 base plus Android permission fix 76b0a74 is removal of raw provider-message logging, so submitted identifiers cannot leak through that log.
- Neither Sign-up with password nor Add password to account was enabled. No global Test mode or authentication bypass was enabled. No password has been entered or saved.
- The ordinary Divergents Review account created with owner approval remains in the existing production Clerk application. Its primary email was shown as verified by Clerk; no privileged metadata or organization membership was assigned. Ignore access restrictions stayed unchecked.
- No credentials or real account identifiers are recorded here. The account was not deleted, and no actual sign-in has yet been verified.
- Existing iOS/TestFlight and the initial Android AAB 123 were not changed. No Play App access credentials saved, new release uploaded, or rollout started.

## Validation

- TypeScript: npm run typecheck passed after removal of password sign-in.
- AuthScreen component tests: npm test -- --watchman=false src/screens/__tests__/AuthScreen.test.tsx, 3 tests passed.
- Checks cover email-code sign-in, email-code registration, and unknown provider errors remaining out of logs with no session/account creation on failure.
- Tests use mocked Clerk calls and synthetic example.invalid data. They do not establish a real production login or delivery of a verification email.
- The prior 11 password-flow tests applied only to the withdrawn implementation and are not evidence for the current flow.

## Remaining closed-test prerequisites

1. Resolve repeatable store-review access compatible with the owner's email-code-only decision. A created account is insufficient evidence that reviewers can sign in independently. Do not invent a permanent code or silently enable production Test mode.
2. Verify real account login, ordinary review content and Android device behavior before declaring Play App access complete.
3. Resolve the separately documented Android Maps configuration blocker, rebuild the corrected AAB, and complete the other closed-test prerequisites. Production publication is not authorized.

## Integration and rollback

- Do not cherry-pick ad9fb71 alone into a future release: its password UI was withdrawn by the owner. Use the updated branch state or explicitly apply the removal if it was already integrated elsewhere.
- Removal of password UI does not remove the separately committed Android permission fix 76b0a74.
- No rollback of Clerk settings is required because those settings never changed. Account deletion would need separate authorization.

## References

- [Clerk authentication settings](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options)
- [Production testing guidance](https://clerk.com/docs/guides/development/testing/test-against-production)
