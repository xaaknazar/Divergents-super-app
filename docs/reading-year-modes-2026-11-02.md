# Extreme and Moderate Reading — implementation

Status: **published in internal TestFlight 107**; see [release evidence](release-107-2026-11-02.md). Mobile base `1ddac7f`, branch `codex/reading-year-modes`. Server code is in `/Users/xaknazar/divergents-lms-year`, branch `codex/reading-year-modes`, based on `c222a3e`.

## What changed

1. Bottom-of-page «Покинуть челлендж» with an explicit destructive confirmation. Only an online server acknowledgement clears local progress. If a request fails, data remains and retry uses the same operation ID. Native restrictions are paused first. Rejoin starts personal day 1 with zero challenge results; late commands from a previous participation cannot restore them.
2. A personal calendar year in Asia/Almaty. The anniversary opens «Ваш год чтения завершён» with a detailed report. Existing participants retain their original joining date. New timers are blocked after the year, including with a cached offline screen; saved last-day approaches may still be reported.
3. «Статистика»: pages, time, finished books, daily pace, best streak, flags, days with completed goal, recent activity and the full book list. Only server-confirmed statistics are exported.
4. Story cards: 9:16 PNG, 1080×1920, navy/paper/night or a personal photo. Select displayed metrics or paginate the book list, then share or save to Photos. Photos stay on the device. Font scaling is fixed only in the share artifact so the exported composition remains stable.
5. Moderate Reading uses 30 minutes in the native timer, offline start, daily completion, rules, diary and ranking explanations. Extreme remains 60. Server rejects simultaneous participation. The two rankings use distinct challenge IDs.
6. Community icons: flame for Extreme, leaf for Moderate. All new visual components are flat files in `src/components`, each with Storybook stories; `ReadingStatisticsScreen` only composes components.

## Main files

- `src/state/useReadingChallenge.ts`, `readingOutbox.ts`: departure, participation identity, stale-device protection, goal propagation.
- `src/data/reading.ts`, `readingOffline.ts`, `readingStatistics.ts`: API fields, annual offline gate, statistics projection.
- `src/components/ReadingLeaveButton.tsx`, `ReadingJourneyCard.tsx`, `ReadingModeIcon.tsx`.
- `src/components/ReadingStatisticsContent.tsx`, `ReadingStoryCard.tsx`, `ReadingStoryEditor.tsx`.
- `src/screens/community/ReadingStatisticsScreen.tsx`, community stack registration.

## Checks

- `npm run typecheck`: passed.
- `npx jest --runInBand --forceExit`: **1118/1118** tests, 130 suites. Includes Swift clock tests. Force exit is used for existing open test handles; no failed assertions.
- Meaningful new cases: warning before reset; 30-minute countdown/overtime; share metric selection; offline Moderate target and participation identity; anniversary gating; outbox discard isolation and in-flight acknowledgement; leave failure preservation; old participation cleared after a remote reset.
- Separate local render of real React Native components via React Native Web: 320/375 point widths, large text, light/dark, story ratio and different mode icons. Web preview uses a Cyrillic system-font fallback; it is not evidence of physical-iPhone rendering.
- `npm run ui:audit`: new Reading statistics screen has no reported boundary violations; all new components have stories. The existing app still reports 2105 issues elsewhere and 17 older components without stories; this task does not claim to fix that global backlog.
- Server verification: 303 passed, 3 unrelated integration tests skipped; see server report for database and migration details.

## Release boundary

No build number bump, server deployment, or TestFlight upload was performed. Publish the server migration and server code first, then the mobile build. Do not publish a mobile-only release expecting Moderate or departure to exist on the old server.

Before release, verify on a physical iPhone: Moderate lock-screen countdown and pause/resume; leave during a paused/running approach; switching to the other mode; exporting/saving a photo-background story. These new end-to-end device scenarios have **not** been run in this task. The native timer implementation was not changed; it already accepts a variable target.
