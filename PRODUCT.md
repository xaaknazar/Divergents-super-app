# Product
<!-- impeccable:product-schema 1 -->

## Platform
adaptive

## Purpose
Divergents is a Russian-language personal-development mobile application for iOS and Android. Members learn from courses and books, participate in community challenges and events, use an AI assistant, explore places, and access career opportunities.

## Structure and jobs
- Five visible main tabs: Обучение, AI, Сообщество, Карта, Карьера.
- Profile is reached from the avatar and contains personal settings, achievements, fitness, and history.
- Preserve nested screens, existing actions, role permissions, feature visibility, progress, applications, notifications, offline behavior, and navigation semantics.

## Confirmed redesign constraints
Confirmed by the user on 2026-10-07: preserve the Divergents blue brand, both light and dark themes, the five tabs and all current functionality. Redesign includes profile and nested screens, on both mobile platforms and different screen sizes. Use Mobbin MCP references. Show visual mockups before implementing the selected direction.

### Sports reference selected by the user
On 2026-10-07 the user selected [Nike Run Club on Mobbin](https://mobbin.com/apps/nike-run-club-ios-449de884-1da3-4133-a57e-5106be737046) as the design reference for sport, running and walking. Apply its task-first hierarchy, prominent workout metrics, map-led start and clear session controls to the existing sports flows, using Divergents branding and existing capabilities. This does not select a new design for unrelated tabs or approve an adapted sports mockup. Keep the existing learning concepts; do not restart the global direction exercise. Reference evidence and adaptation boundaries are recorded in `docs/mobbin-redesign-research.md`.

### Creation confirmation selected by the user
On 2026-10-07 the user selected [Luma's creation-success screen and animation](https://mobbin.com/screens/8f9dc2c6-c9a6-43d6-8a93-bb15606f9c74), then explicitly requested immediate implementation without a separate mockup. This narrow exception to mockup-first covers the result of successful challenge, meetup, sport, trip and channel creation. Implementation and remaining native visual QA are documented in `docs/creation-success-2026-10-07.md`; it does not approve unrelated redesigns or a release.

### Global block style selected by the user
On 2026-10-07 the user explicitly requested implementation of [Revolut Business](https://mobbin.com/apps/revolut-business-ios-93ad9ceb-a163-41da-ba7a-9f07c737fc2a) block styling across the app. This replaces the earlier unselected global concepts as the visual authority and authorizes direct code implementation for this request. Preserve Divergents blue, Russian content, both themes and five tabs. Use flat grouped surfaces, round actions, clear title hierarchy and restrained borders; keep Nike Run Club as the specialist sports reference and the implemented Luma creation receipt. This does not authorize publication. Current implementation scope and verification limits: `docs/revolut-redesign-2026-10-07.md`.

### Liven replacement selected by the user
On 2026-10-07 the user explicitly selected [Liven](https://mobbin.com/apps/liven-ios-033811d5-116f-4528-b152-e1618a7b0f87) for implementation across the Superapp. Liven now supersedes Revolut as the global visual authority: compact outlined groups, illustrated learning/actions, centred accomplishment moments, clear daily progress and quiet attached navigation. Preserve the existing blue/navy palette exactly, existing content, routes and business logic. Direct implementation is requested; no new concept tournament or release. The earlier sports task hierarchy and creation receipt behaviour remain, expressed in the new shared visual language. The May 2026 collection was inspected through Mobbin MCP plus the signed-in browser (279 screens, 71 flows; static coverage is distinct from motion verification).

Current implementation, source inventory and verification limits are recorded in `docs/liven-redesign-2026-10-08.md`. Static reference coverage does not imply that every native screen has been migrated or visually approved.

## Technical boundaries
React Native and Expo TypeScript client. Real data and authorization come from the Divergents LMS API. No backend changes, data migrations, publication, or changes to scoring and access rules are part of this redesign. Existing uncommitted work must be preserved.

## Accessibility
Retain font scaling, screen-reader labels, safe areas, platform Back gestures, reduced-motion and reduced-transparency preferences. New appearance must work with long Russian labels and large text.
