# Event management — 2026-11-08

Prepared locally for meetup, sport and trip events. This is an ordinary extension of the current app, not a redesign or release. No production database changes or deployment were performed.

## Implemented behavior

- Event creators and administrators can edit an unfinished event's title, description, meeting place, time, capacity and optional map coordinates. Saving shows server errors and sends notifications to accepted participants. Capacity cannot be reduced below the accepted count; zero means unlimited. A changed start time must be in the future. Equivalent ISO/local timestamps do not create a false time change.
- Organizers can publish announcements, including after an event has finished. The event page displays the latest 50 announcements. Accepted participants receive an in-app notification and a queued push, excluding the actor.
- An organizer can explicitly finish an event after its start. This closes applications and preserves the roster. Events also become finished under the existing Almaty calendar expiry rule. Completed events remain reachable from the profile's new «Мои встречи» section for creators and participants with pending/approved/going applications.
- After completion/expiry, the organizer can mark an accepted participant «Не пришёл» or «Нарушение правил», with a required explanation. Self/organizer flags are disallowed. The participant sees active flags in their own profile; creators and administrators see the applicant's active event history when reviewing an application to their event. Private questionnaires and contacts retain their existing administrator restriction.
- A flag can be changed or revoked with a required correction explanation. The affected participant is notified. Revoked flags disappear from profile/applicant reports, while the audit remains. These are event records, separate from challenge flags and points; they do not automatically reject future applications.
- Before sending an application, Russian disclosure explains organizer review, attendance flags, future visibility and cancellation before the start. Cancellation keeps the application record: accepted participants cannot cancel after the start, and no one can cancel a finished event to erase attendance. An organizer cannot cancel their own participation.

## Client integration and design

`src/data/eventManagement.ts` supplies authenticated reads/writes. `useEventResource` scopes data by account and event/applicant, refreshes on navigation focus, and rejects stale responses after identity changes or blur. Missing tokens, timeouts and failed writes produce explicit errors; these sensitive records do not use a successful-looking mock fallback. Existing event detail refresh signals cover app foregrounding and notifications.

`EventManagementPanel`, `EventAttendancePanel` and `EventHistoryPanel` compose the flows. `MeetupDetailScreen` handles both meetup and sport variants; `TripDetailScreen`, `EventApplicantsScreen` and `ProfileHomeScreen` host the new functionality. `EventAttendanceReport`, `EventEditSheet`, `EventMessageSheet`, `EventDateField` and `EventTextField` separate presentation from data access. Forms block duplicate taps and retain an operation ID for an unchanged retry. Server confirmation precedes closing a successful form.

This extension reuses `useTheme()` semantic colors and Gotham Rounded type, flat `ListSection` groups, shared buttons, notices, labels and `HalfSheet`. The date field uses the native picker with `Asia/Almaty` and Russian labels; Android opens date then time selection. The saved local format is `YYYY-MM-DD HH:mm` (UTC+5), independent of the device timezone. Coordinates remain explicit text fields, with instructions to update or clear both when changing the address.

Presentation stories cover the report, editing/message sheets, date and text fields, including light/dark and relevant loading/error/disabled variants. No global visual authority changed. `PRODUCT.md`, `DESIGN.md`, tokens and the design sidecar were preserved. The existing DESIGN record already acknowledges older neutral/radius drift; current theme source remains the implementation authority for this extension, and that wider drift was not repaired.

## Backend contract and release dependency

All new routes require Clerk authentication and return `Cache-Control: private, no-store`:

| Route | Purpose |
| --- | --- |
| `GET /api/mobile/events/manage?kind=…&eventId=…` | Event edit snapshot, permissions, completion state and announcements |
| `POST /api/mobile/events/manage` | `edit`, `announcement`, `complete`, `flag` or `revoke`, with an operation UUID |
| `GET /api/mobile/event-attendance` | Current account's active flags |
| `GET /api/mobile/event-attendance?kind=…&eventId=…&applicationId=…` | Authorized organizer/admin view of that applicant's active flags |
| `GET /api/mobile/me/events` | Up to 100 own/participating events, including finished events |

The backend is the authorization and validation authority. General event-permission holders retain existing application-review access, but the new management/attendance operations specifically require the event creator or administrator. Closed/expired management reads require organizer/admin access or an active pending/approved/going application. No arbitrary target user ID is accepted by the attendance endpoint.

Before releasing the client, apply the backend's `prisma/migrations/20261108_event_management.sql`, grant its new tables to the `divergents_api` runtime role, regenerate Prisma and deploy the compatible API. The companion backend record has the operational details. The branch also contains the earlier pending `20261108_personal_library.sql`: verify/apply that schema and its grants before deploying the combined backend. It is a release dependency of the combined branch, not a logical prerequisite for attendance flags.

## Verification and limits

The implementation handoff reports a clean mobile TypeScript check and all 156 Jest suites passing: 1,311 passed, zero failed, including the authorized Swift cache checks. Backend TypeScript passed; 384 tests ran with 374 passed, 10 skipped and zero failed. These totals are reported from the parent implementation run, not rerun by this documentation pass.

SQL was exercised separately in an isolated `pgvector/pgvector:pg17` container with no network and a minimal base fixture. Checks covered the new tables and three `completedAt` columns, API-role SELECT/INSERT/UPDATE/DELETE permissions, uniqueness, invalid reason rejection, revocation and audit writes. Transaction rollback left zero test rows. This was not a production restore, full-schema migration rehearsal or production test.

Native evidence: `/tmp/events-flag-light.png`, `/tmp/events-flag-dark.png`, `/tmp/events-edit-light.png`, captured on an iPhone simulator running iOS 26.5. The final review reported all four code findings resolved, readable light/dark content and spacing, and a visible white close × in both flag captures; its approval is limited to the reviewed scope. A development notifications entitlement toast obscured part of the footer. These local temporary captures are evidence references, not committed release assets.

Picker interaction, keyboard handling, large text, iPad, Android/physical devices and real push delivery remain unverified. Enqueueing a durable push is not evidence of provider/device delivery; the existing push outbox worker, registered tokens and native notification setup must work in the target environment. No attendee check-in, automatic no-show detection, automated ban, separate appeal workflow or public flag directory is introduced. Users are instructed to contact the organizer about an incorrect flag.
