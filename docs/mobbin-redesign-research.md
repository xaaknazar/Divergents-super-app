# Mobbin redesign research — 2026-10-07

Status: direction mockups pending selection; component architecture refactoring started under the user's later explicit request. The global visual redesign is not implemented. User confirmed scope and mockup-first workflow.

## Mechanism and scene
A member turns learning into participation and personal progress inside one community. Frequent short visits on a phone: continue a lesson, record challenge progress, find a meeting, consult AI, check a career opportunity. Operate mode; native navigation and clear state take precedence over decorative expression.

## Mobbin screens inspected through MCP
- Learning: [Headway](https://mobbin.com/screens/a8fca4da-5640-41e8-bd8d-381bd007e0f3), [MasterClass](https://mobbin.com/screens/17fa4f0c-4c45-40b2-bf21-e96e4023cc1a), [Moonly](https://mobbin.com/screens/1329e4d1-7a9a-470c-bc4d-a12e9702a3da). Progress hierarchy, category selection, cover-first discovery.
- Community: [Meetup](https://mobbin.com/screens/662f6722-eca0-4ca7-9a3e-ba589067884b), [WhatsApp](https://mobbin.com/screens/3c34870d-846d-47a8-b2ef-c70226d4dabd). Upcoming events before discovery; groups separate from announcements.
- AI: [Microsoft Copilot](https://mobbin.com/screens/7d36cdb1-6c49-4cd5-8c9b-3fbd3829bb5d), [Google](https://mobbin.com/screens/2009730f-5df7-4acd-9933-667bf368d1b8). Anchored composer and suggestions; keyboard-aware spacing.
- Map: [Places](https://mobbin.com/screens/a975205e-1d5d-48a8-b153-0ad30ccf710a), [corner](https://mobbin.com/screens/b373bfce-8fc3-476f-96f4-d48fbe24c4f3). Search and category controls over map, selected-place sheet.
- Career: [Glassdoor](https://mobbin.com/screens/08dbbd95-789e-409c-9084-37b51c13f9eb), [Upwork](https://mobbin.com/screens/02c385ca-44de-4aec-8a89-1f5ec7dcad24). Scan-friendly vacancy metadata and saved states.

Use interaction patterns and hierarchy, not other products' logos, artwork, or commercial claims. Mock data in previews is illustrative, not production account information.

## Seven viable worlds, ranked before concept seed
Excluded ruts: generic stacked dashboard tiles; its opposite, a decorative immersive feed. No invented navigation or capabilities.

1. **Клубный журнал.** Contemporary members' learning journal: strong typographic headings, real course covers, navy editorial bands, quiet structured rows. Familiar reading and community culture; keeps the next lesson central. Publication family.
2. **Маршрут развития.** Urban transit wayfinding: aligned stations and connected progress markers within content, clear location and next action. Navy route strip, white space, 16-point corner family. Five native tabs remain unchanged. Wayfinding family.
3. **Тренировочный дневник.** Coaching training log: disciplined day columns, strong numerals, precise progress bars, low-noise lists. Native controls, slate surfaces and navy action zones. Practice/log family.
4. **Кампус.** University campus directory: generous section signage, clear departments, index rows and visual destinations. Native tab architecture, clean navy headings and pale-blue fields. Institutional wayfinding family.
5. **Книжная полка.** Library catalog: cover-led rails, compact catalog labels, orderly detail sheets; people and event images replace covers in other sections. White, navy, natural content color. Collection/catalog family.
6. **Командное табло.** Sports results board: large readable totals, strong sectional boundaries, compact status rows and deep-blue headers; personal course progress uses the same honest notation. Scoreboard/data family.
7. **Записная книжка участника.** Personal field notebook: task-first narrow index, date/section labels, consistent navy rule and soft neutral panels, restrained rounded display face. Each screen emphasizes one action. Notebook family.

## Guidance judgment
UI/UX Pro Max design-system search returned a child-oriented claymorphism/landing-page recommendation. It does not match this adult native utility and is not adopted. Native accessibility, semantic tokens, hierarchy and responsive guidance remain applicable.

## Additional sources requested by the user

- [Layero icons](https://icons.layero.app/): opened Stroke/Filled catalog and inspected the consistent rounded outline treatment. Public catalog did not expose a license link in the inspected UI. No SVGs have been shipped; license/provenance must be confirmed before adding assets. Avoid mixing arbitrary icon weights.
- [Designeer](https://www.designeer.xyz/): used the Design Galleries directory to find motion references, including 60fps and Details. It is a resource directory, not a native component dependency.
- [Airbnb tactile tabs via 60fps](https://60fps.design/shots/airbnb-tactile-tab-button-interaction): inspected the live recording and description of press depression, selected highlight movement and loading crossfade. Candidate adaptation: restrained tab/chip feedback; no artificial loading delay, no bounce when Reduce Motion is active. Not implemented before direction approval. No public most-rated/popularity measurement was verified for this item.

External examples inform hierarchy and interaction, never supply runtime styles to app components. Native implementations retain private styling and semantic state APIs.

## Learning/header follow-up

Inspected through Mobbin MCP during the second structural pass:

- [MasterClass — My Progress](https://mobbin.com/screens/b90dc5f8-0a41-4dc9-8da7-df150dd80b82):
  distinct Continue Watching, My List and mastered-course sections, horizontal
  cards, search/avatar at the top. Supports separate shelf/card/header components;
  does not justify changing our access rules or adding nonexistent capabilities.
- [MasterClass — My Bookmarks](https://mobbin.com/screens/125f0579-2126-4a42-bd27-811f0b255c2c):
  labelled groups of saved lessons and moments with thumbnails and duration.
  Inspected as a secondary reference, not implemented as a new bookmarks feature.

The broader earlier search returned Public educational options and Tolan level
lists; these were inspected but not selected as course-catalog references.
No popularity ranking or “latest animation” claim was inferred from search order.

## Sports — user-selected Nike Run Club reference

Selected by the user on 2026-10-07:
[Nike Run Club app](https://mobbin.com/apps/nike-run-club-ios-449de884-1da3-4133-a57e-5106be737046).
This is a pinned reference for sports, running and walking, not a replacement for
the existing learning concepts. Status: reference inspected and adaptation scoped;
no sports UI implementation or new sports mockup was produced in this pass.
The mockup-first agreement remains in force.

Screens visually inspected through Mobbin MCP:

- [Start on a map](https://mobbin.com/screens/f4f49c14-69af-4d0b-ae3a-e9c187981ff9):
  a map with location, a dominant round Start action, smaller secondary controls
  and an optional goal action. Adapt the map/action hierarchy, not Nike artwork,
  weather cards, music controls or an unsupported per-session goal feature.
- [Active session](https://mobbin.com/screens/0f6d4dea-2e39-419f-a0df-6e48da4be7f0):
  dominant distance, smaller time/pace fields and a large pause control. The
  inspected capture is landscape; its hierarchy informs our portrait layout,
  not a new forced-orientation behavior.
- [Paused session](https://mobbin.com/screens/7c5bf619-191e-4fbd-aa0c-1e467241b8da):
  separate resume and stop controls with a stable summary. Keep visible Russian
  action labels and preserve our existing state transitions and exit protection.
- [Completed run](https://mobbin.com/screens/fdd8734e-60a2-4e86-a070-6744a05e4a7d):
  date/title, prominent distance, supporting metric grid and route map. Use only
  metrics available in Divergents; do not invent calories, heart rate or cadence.
- [Route detail](https://mobbin.com/screens/46fc5835-9f3d-4fa6-9387-3f347d41cd99):
  large route map and metric-specific graph. Map emphasis is applicable; colored
  pace segments and elevation time-series are not approved additions and must
  not be implied by our coordinate-only saved route data.

### Adaptation to the current app

| Existing surface | Intended visual adaptation | Behavior/data that must stay intact |
| --- | --- | --- |
| `WorkoutTrackScreen` — before start | Map-first layout, readable Бег/Ходьба selector, prominent brand-blue Старт control | Current location/permission states, activity-type selection only while idle |
| `WorkoutTrackScreen` — recording/paused | Distance is the main number; time, pace and steps are secondary; clearly separated large controls | GPS/background recording, elapsed and moving time, pause/resume/finish, duplicate-save protection, exit confirmation |
| `WorkoutDetailScreen` | Large distance followed by honest metric summary and route | Actual/estimated steps distinction, old records with missing fields, challenge credit and role/access checks |
| `WorkoutHistoryScreen` | Consistent typographic totals and quieter session rows | Existing month grouping, loading/empty states, session detail navigation; not presented as an inspected Nike history screen |
| `WorkoutShareScreen` | Route and key result dominate the share card | Existing export/share behavior; no Nike logos, athlete imagery or invented metrics |
| `MyFitnessScreen`, program history/results | Carry the same numeric hierarchy into goals, records and program results | Daily program logs, streaks, totals, reminders and existing actions; composition still needs a Divergents mockup |

### Design and implementation boundaries

- Preserve the five main tabs, Russian UI, Divergents navy, light/dark themes and
  platform navigation. Do not copy Nike's orange/yellow accent or replace the
  full app's identity with its branding.
- Prioritize glanceable numerals and controls usable during activity. Mobile App
  Design Standards supplies the touch-target floor (44pt iOS / 48dp Android),
  font scaling and safe-area requirements. UI/UX Pro Max's React Native search
  supports semantic Pressable controls, accessible roles and expanded hit areas;
  its database version metadata is not authority to upgrade this Expo project's
  dependencies. No framework upgrade is part of the reference selection.
- Preserve Reduce Motion. Static Mobbin images do not establish animation
  timing, popularity, or a latest/most-rated ranking; none was claimed.
- Components own appearance; screen composition uses Wrapper for layout only.
  Reuse existing semantic components where they fit, keep new components flat in
  `src/components`, and add light/dark/state stories when implementing.
- The selected reference pins the sports direction under Impeccable's
  user-brief-first rule. Do not re-roll the global design choices. Approval of
  the source is not approval of an adapted mockup or evidence of a shipped UI.

## Creation confirmation — Luma

The user selected [this exact Luma screen](https://mobbin.com/screens/8f9dc2c6-c9a6-43d6-8a93-bb15606f9c74)
and explicitly chose immediate implementation. The exact MCP screen and its
4.63-second video were inspected, including the checkmark, expanding particle
ring and staged content reveal. Local implementation is complete with tests;
native visual QA remains outstanding. See [implementation record](creation-success-2026-10-07.md).
