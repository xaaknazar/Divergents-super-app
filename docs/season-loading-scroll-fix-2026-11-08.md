# Season loading and scroll headers — 2026-11-08

Status: implemented and verified locally; no new IPA, TestFlight upload, server deployment or database changes in this task.

Base: d561ae0 (release 119), isolated worktree /private/tmp/divergents-activity-converter, branch codex/activity-converter. Main working directory was not modified.

## Problems and corrections

- Season loading depended on Clerk getToken function identity. A new identity could cancel/restart the request while the sheet was already showing seasons. The effect now depends on opening, account, challenge and explicit retry; it reads the current token function through a ref. A 15-second deadline covers both authentication and fetch. Closing/account changes cancel requests, late responses are ignored, failed refresh retains previously loaded rows and ends the spinner.
- Reading ranking and several list/detail screens placed their scroll viewport below a fixed header. The viewport boundary visibly sliced cards. ScrollHeader now floats above full-height content with a fading, non-interactive edge. Navigation clearance is measured inside content, not above the viewport. Reduced-transparency mode follows the theme.
- Screen and DetailScreen use shared chrome; full-bleed course covers still start under the status bar. RankingScreenFrame is shared by Reading and ordinary challenge rankings. Compact large-title headers no longer use a hard rectangular bottom edge.
- ScrollHeaderLayout supports existing native ScrollViews/FlatLists without replacing their virtualization, refresh, keyboard or footer behavior. Stories were added for both new components.
- Reading secondary metric stays on one line, with limited font fitting rather than splitting the unit.

## Source audit coverage

Updated: Reading/ordinary rankings, challenge days/results/roster/detail and upcoming challenge, applicant lists and profile modals (challenge/event/vacancy), joining/managing a challenge, workout details/history, program history, challenge history, personalization, notifications, vacancy creation, talent profile/resume form, map place details/add/admin lists.

Shared DetailScreen update also covers its scrolling consumers. Existing headers already inside scrolling content were left in place (Reading detail/history/statistics, channels, trip/meetup heroes and other equivalent layouts). Map/tracking canvases, story canvases, video and chat layouts retain their specialized non-table chrome; the channel feed already has full-height scrolling and an overlay header.

## Validation

- npm run typecheck: pass.
- npx jest --runInBand --forceExit: 144 suites, 1251 tests passed, 0 failures. Native Swift tests ran with access to the normal compiler cache.
- New regression tests: unstable token function identity; token timeout/retry; close/reopen and late response; account changes; failed refresh preserving rows; measured header clearance; full-bleed cover; native list padding preservation.
- Existing spectator/applicant test fixtures updated for shared header test ID and safe-area context.
- git diff --check: pass.
- Isolated UI fixture displayed on existing iOS 26.5 simulator development client; season sheet opens. Browser renderer at 390 × 844 verified scrolling beneath the header in light and dark themes (viewport top remains 0). Fixtures contain no real API/account data. Browser rendering is not equivalent to full native validation.
- Native scroll gesture automation was unavailable in this session. No physical iPhone check, authenticated production season-sheet check, or claim of visually exercising every screen.
- Temporary fixture entry was removed and index.js restored exactly before final tests.

Local review artifacts: /private/tmp/divergents-scroll-review/season-ios.png, reading-scroll-dark.png, reading-scroll-light.png. Test logs: /private/tmp/divergents-scroll-fix-tests-final.log and /private/tmp/divergents-scroll-typecheck.log.

## Release follow-up

Include in the next native build after normal release checks. On a phone: repeatedly open/close Seasons, switch seasons, background/foreground, then scroll Reading/team/member rankings and a native list with normal and enlarged text; verify light/dark and Reduce Transparency. Real results, season numbering and permissions are unchanged.
