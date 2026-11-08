# Event applicant activity · 2026-11-08

## Scope and release status

The event applicant questionnaire adds an «Активность в Divergents» section for reviewers who already have permission to view the applicant's profile. It combines questionnaire completeness, confirmed challenge participation and saved Reading results. This is an ordinary extension of the existing applicant report, not a new visual direction or scoring system.

Implementation is pending release. The changes are saved in local commits; nothing has been deployed or published. **Release the website endpoint before distributing the mobile build.** An older server without the endpoint produces the recoverable unavailable state, not a fabricated empty history.

## Source inventory

Mobile sources, relative to this repository:

- `src/screens/community/EventApplicantsScreen.tsx`: mounts the activity section only when `canViewProfiles` is true and an application is selected; passes completeness through the existing `normalizeProfile` and `effectiveResumeCompleteness` helpers in `src/data/talentslab.ts`.
- `src/components/ApplicantActivityReport.tsx`: presentational section, separate challenge and Reading metrics, loading/empty/error/partial states and retry controls.
- `src/components/EventApplicantActivity.tsx`: authenticated request lifecycle, cancellation, 15-second timeout and selected-user/application isolation. Applicant history is not persisted locally.
- `src/data/applicantActivity.ts`: response types and application-scoped API request; rejects missing authentication, failed responses and mismatched application IDs.
- `src/components/ApplicantActivityReport.stories.tsx`: fictional examples for Light, Dark, CompactLargeText, Loading, Unavailable, Empty and Partial.
- `src/components/__tests__/ApplicantActivityReport.test.tsx`, `src/data/__tests__/applicantActivity.test.ts` and `src/screens/community/__tests__/EventApplicantsScreen.test.tsx`: rendering, request, retry, stale-response and access regressions.

Website commit `f69bf51` on `codex/applicant-activity` is in `/private/tmp/divergents-event-access`:

- `lib/applicant-activity.ts`: read-only aggregation using existing authoritative challenge results and Reading history.
- `app/api/mobile/event-applicant-activity/route.ts`: `GET /api/mobile/event-applicant-activity?kind=…&eventId=…&applicationId=…`, supporting meetup, trip and sport applications.

## Access and data meaning

The endpoint requires Clerk authentication and the same organizer/profile-view authorization as the protected applicant questionnaire. It resolves the target user from the application belonging to the specified event; callers do not supply an arbitrary target user ID. Permission and application membership are checked again after aggregation. Responses use `Cache-Control: private, no-store`.

Only approved challenge applications and approved Reading memberships count as participation. Pending and rejected applications are excluded. Regular challenges show the title, team, start date, participation status, authoritative points and rank among the result set. Status can distinguish upcoming, active, finished, left and eliminated participation when the source provides that evidence.

Regular results reuse `getChallengeResults` and shared challenge timing/scoring helpers. Reading results reuse `readingReaderHistory`, `readingWindow` and `readingYear`; the request does not expose the applicant's editable sessions or private bookshelf. Reading shows pages, whole minutes of reading, days read, days meeting the norm, red flags and average pages per day when available. These are distinct metrics, not challenge points. The legacy reading-days fallback excludes days marked `excluded`.

Reading exits previously reset saved results. The report only presents surviving approved membership/history and does not reconstruct or claim a complete record of that erased participation. The section explains this limitation in its visible footnote.

Questionnaire completeness uses the existing helper and current protected profile data. An unavailable profile displays «Нет данных» rather than an invented zero. A genuine numeric zero returned for a result remains visible.

## States and recovery

- Loading displays an activity indicator and explanation while keeping known completeness visible.
- Empty is shown only after a successful response with no confirmed participations.
- Request failure explicitly says that unavailable activity does not mean there are no participations and offers «Повторить загрузку».
- A per-participation calculation failure preserves its title and membership details with «Результат пока недоступен», plus «Обновить результаты». Other available results remain readable.
- Switching the reviewer, selected application or request attempt invalidates the previous response. Cleanup aborts requests; a late response cannot replace another applicant's activity.

No live applicant activity is replaced with mock results or fabricated zeros on error. Storybook data is explicitly fictional.

## Inherited visual system

`ApplicantActivityReport` renders inside the existing `ApplicantReportSection`, which owns the `ty.title3` heading and shared `ContentBlock`. The content block retains active-theme `T.cardBg` and `T.cardBorder`, continuous `radius.block` corners and its regular padding. Report content uses the existing scaled `headline`, `subhead`, `subheadEm` and `footnote` roles, semantic label/brand/separator colors, `Wrapper` spacing and shared tinted `Button` controls. Numeric values use tabular figures. The completeness row wraps, and entries use vertical text flow for long labels and larger text.

No new palette, typography, token set, illustration or shipping raster asset was introduced. `PRODUCT.md`, `DESIGN.md`, the design sidecar and shared theme/component sources remain unchanged by this extension. The existing design documentation already acknowledges neutral/radius drift: for example, its older content-block record has a 20px radius and 18px regular padding, while current runtime code uses `radius.block = 26` and 16pt regular padding. This extension follows the live shared component, without refreshing unrelated historical documentation.

## Verification and limits

The implementation handoff reports:

- Mobile TypeScript check passed; 23 related tests passed across 5 suites.
- Website TypeScript check passed; 119 tests passed and 6 database integration tests were skipped out of 125. The latest rerun includes the correction excluding legacy excluded Reading days.
- Storybook cases cover light, dark, 320pt width with XL text, loading, empty, error and partial results.
- Actual iOS 26.5 Simulator captures exist at `/tmp/applicant-activity-light.png` and `/tmp/applicant-activity-dark-compact.png`. The dark compact capture's lower section is offscreen; it is not evidence that the complete scrolled report was visually inspected.

An existing Keychain / `expo-notifications` debug warning was observed during simulator work. No physical iPhone verification was performed. Component stories and simulator captures do not establish a deployed endpoint, an end-to-end production check or a release.
