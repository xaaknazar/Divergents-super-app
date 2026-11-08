# Data safety evidence - draft, not a completed declaration

Source: iPhone 123 shared client `0d3956c`. Final Android manifest/SDK and server review pending.

| Data | Current evidence | Declaration considerations |
| --- | --- | --- |
| Name, email, user IDs | Clerk auth; `src/data/api.ts` profile synchronization; `src/data/talentslab.ts` | Account management and app functionality; required account identifiers |
| Phone, city, date of birth, gender, citizenship, education, work, family information | `src/data/resumeSchema.ts`, `src/data/talentslab.ts` | Personal info; optional app feature, mandatory fields within the resume must not be called universally optional without checking the account gate |
| Religious beliefs | Explicit religion and practicing fields in `src/data/resumeSchema.ts` | Must be disclosed; the text allows "Не указываю" but the field exists and is transmitted |
| Salary expectations | Resume schema `expected_salary` | Check Other financial info definition; not a financial service |
| Gallup/MBTI/Gardner, reports and files | `uploadGallupFile`, profile and resume snapshot | Other personal info, files/documents; do not label as clinical diagnosis |
| Photos | Profile, place submissions, assessment uploads | Photos; optional feature; not all selected gallery pictures are uploaded |
| Audio | Channel audio-post upload | Voice/sound recordings; feature-dependent |
| User text | Course comments, reviews, posts, notes and AI prompts | Other UGC and applicable in-app messages; inspect transport and retention |
| Fitness | Challenge progress sends steps and other activity metrics | Fitness information collected for challenge functionality |
| Local fitness/weight and workout coordinates | `FitnessContext` and `ActivityContext` persist on device | Local-only storage is not automatically off-device collection; check backups and any sync before final answer |
| Approximate location | Profile city, saved city/country sync, service requests/IP | Location type; app functionality and account data |
| Precise location | `MapHomeScreen.fetchRoutes` sends start/end coordinates to OpenStreetMap routing/OSRM | Collected off-device even though raw workout routes stay local; sharing exception needs verification, do not assert no sharing without it |
| Map searches | `MapHomeScreen` queries Nominatim with entered text/view box | In-app search history; clarify ephemeral processing and provider logs |
| App interactions | Course completion, challenge operations, reading sessions, event participation and reactions | App functionality, personalization where applicable |
| Device identifiers/diagnostics | Clerk/Expo/native maps/hosting behavior still to audit | Do not claim no diagnostics merely because no Sentry dependency; no ad SDK found in package/source search |
| Installed applications | Android reading focus selects packages, AccessibilityService | Verify local-only behavior; not automatically a transmitted app inventory |

## Important distinctions

- Current `docs/appstore-fill-guide.md` and `docs/appstore-release.md` are old: manual-only steps, approximate-only location and unconditional all-No age answers are not valid evidence for 123.
- Server AI processing, Talentslab ownership/processor relationship and provider data retention must be established before final collected/shared declarations.
- Server code checked in `/private/tmp/divergents-event-access`: `lib/anthropic.ts` supports direct Anthropic and OpenRouter; project chat confirms current OpenRouter runtime with Anthropic Claude Haiku 4.5. `app/api/mobile/ai/route.ts` sends user message/history plus client profile context and server profile to the model. `lib/embeddings.ts`/`lib/rerank.ts` send text to Voyage. Talentslab legal ownership remains unconfirmed. Auth, push registrations and reading-integrity/session records exist, as do server API logs.
- Google exceptions for processors and user-initiated sharing must be assessed against the actual flow; no blanket exception assumed.
- Deletion URL currently has an operator placeholder; do not claim the public deletion information is fully ready.
- Live `/privacy` also visibly says it is a draft, contains operator/BIN/address placeholders and incorrectly describes activity steps as manual-only. Its provider list includes Anthropic and OpenRouter processing prompts and profile/psychometric data, plus Clerk, Talentslab, Neon, Vercel, Mux, UploadThing, Voyage, Expo and MapTiler/MapLibre. It does not identify the observed OSM/OSRM routing flow. The page must be reconciled with 123 before the release is represented as ready for Google review.
- Deletion evidence: `src/screens/profile/ProfileHomeScreen.tsx` passes `user.delete()` into `src/state/signOut.ts::deleteAccountAndClear`, which also clears local state. The inspected server `app/api/clerk-webhook/route.ts` only handles `user.created` and `user.updated`, not `user.deleted`. Propagated LMS/Talentslab/file deletion and the claimed 30-day process are not proven by this implementation. A manual or separate workflow may exist, but it has not been confirmed. No actual deletion was attempted.

## Official references checked

- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/14738291
- https://clerk.com/legal/privacy (general service notice is not a precise inventory of this app's SDK behavior)
- https://expo.dev/privacy-explained
