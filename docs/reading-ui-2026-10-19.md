# Reading challenge — UI update

Changes after TestFlight build 90, included in the verified iOS 1.0.0 (91) artifact. Server changes are live as of 19 October 2026, 23:25:08 Asia/Almaty. Direct upload through official Xcode altool succeeded; Apple processing is VALID and internal availability is confirmed for Team (Expo), 5 testers. The queued EAS Submit was canceled without uploading to Apple. No external group was added and no public App Store release was submitted. See [reading91-release-2026-10-19.md](reading91-release-2026-10-19.md).

[Build 91 in App Store Connect](https://appstoreconnect.apple.com/teams/d4bb6fec-2b82-44c6-b91d-b679b1114a6e/apps/6796377452/testflight/ios/4e5f694f-8e26-4e84-941a-6e4e619e06b7).

## Component boundaries

- `ReadingChallengeShelf`: renamed the community section to **Reading challenge**; replaced generic text-only ActionBlock instances with a complete `ReadingChallengeCard`. Shelf owns spacing and navigation, card owns appearance. No style override API.
- `ReadingChallengeCard`: brand hero, phase, duration, membership and contextual action. Semantic API: challenge data and onPress only.
- `ReadingChallengeHeader`: existing palette, block radius and typography; compact active header and formatted start date. No decorative background bubble.
- `ReadingTimer`: existing timer calculation and controls retained. Brand typography, quieter supporting copy, container-aware ring size; larger text appears outside the ring rather than clipping or suppressing font scaling. Existing Reduce Motion support retained.
- `ReadingProgressSummary`: reused ResultMetric for days, pages and extra minutes. Container-aware stacked layout, readable day statuses, expandable full history. No historical records removed.
- `ResultMetric`: added semantic focus/completed kinds; existing challenge metrics unchanged.
- `ReadingTeamCard`: team identity, capacity/progress, own-team indicator, join and roster actions. No CSS-like presentation props.
- `ReadingMemberRow`: consistent grouped ranking rows with personal highlight and explicit day state.
- `ReadingRules`: accessible expandable rules, initially open during recruitment; source rules unchanged.
- `ReadingChallengeContent`: composition and callbacks only; replaced inline card/ranking/history templates with reusable components. Kept eligibility, page validation, review actions, recovery flow and pagination.
- `ReadingChallengeScreen`: navigation title matches **Reading challenge**.

## Verification

- TypeScript passes.
- 84 Jest suites / 582 tests pass after the continuous-mode update, including card navigation, team join/filtering, full history, rules disclosure, permanent-mode creation, book metadata, continuation pages and account isolation.
- Storybook coverage added for all five new components; light/dark, compact large text, recruitment, full team, spectator, pending, completed states.
- Simulator screenshots: dark full challenge and compact large-text challenge inspected. No backend or native protection changes.
- UI audit reports no missing stories for the Reading components. Existing unrelated UI boundary issues remain elsewhere in the application.

The eight meeting recordings have now been reviewed. The permanent-mode implementation, user clarifications, assumptions, verification and remaining release work are recorded in `reading-continuous-2026-10-19.md`. New Pace, BookPicker, BookHistoryCard and HistoryContent components have Storybook stories. Native protection is unchanged; server additions and the migration are live. Apple processing and internal TestFlight availability are confirmed. The new full flow in the main mobile app has not yet been verified on a physical phone.
