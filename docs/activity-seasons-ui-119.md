# Activity and season UI extension · 119

This extends the existing React Native iOS 118 visual world with the approved activity calculator, questionnaire-controlled yoga/pilates option, season history selector and soft ranking scroll edge. It does not replace the global design system or establish release approval.

## System comparison

[PRODUCT.md](../PRODUCT.md) establishes Russian content, Divergents blue, both appearances, existing navigation and permissions. [DESIGN.md](../DESIGN.md) records the earlier Liven adaptation and subsequent navigation-glass corrections. The current implementation follows the incumbent `useTheme()` typography and semantic colors, shared `Button`, `HeaderIcon`, `NavHeader`, `GlassSurface` and `ColorWash` components. No theme token, font, image or global navigation change is introduced by this extension.

The root design record already acknowledges historical palette/radius drift. For example, current `src/theme/tokens.ts` uses light grouped `#F2F2F7`, dark card `#161B26`, block radius 26 and pill actions, whereas older global frontmatter records other values. These are pre-existing differences, not changes made here. `PRODUCT.md`, `DESIGN.md` and the design sidecar remain untouched; runtime theme code governs these surfaces.

Local additions are a 30-unit continuous top sheet corner, 16-unit calculator input corner, 24-unit season capsule corner and an appearance-specific translucent gradient above the ranking. These are scoped component choices, not new global tokens. The season capsule retains the existing clear navigation-glass treatment with white content. The ranking gradient uses fixed light/dark colors rather than personalized accent values.

## Component contracts

| Component | API and behavior |
| --- | --- |
| `HalfSheet` | Required `visible`, `title`, `onClose`, `children`; optional `onBack`, `footer`. Bottom modal with independently scrolling body and fixed footer. Height is 57% of the window with a 410-unit minimum, bounded by the top safe area; system font scale above 1.3 requests 80%. Dismiss through close, backdrop, platform request-close or a downward handle gesture. Reduced motion disables the slide animation; iOS uses keyboard avoidance. |
| `ActivityCalculatorSheet` | `current: number`, `phoneSteps: number \| null`, `gender: unknown`, `onClose()`, `onSave(total)`. Mounted only while open. Summary → activity choice → amount entry, with local edit/remove actions. Valid totals enable Save; callback supplies the day's aggregate, not a delta or an activity ledger. Reopening starts from the supplied current total and an empty additions list. |
| `SeasonButton` | Optional `season: number \| null`; required `onPress()`. Glass header capsule displays the supplied season or “Сезоны”; accessible label explains selection. |
| `ChallengeSeasonSheet` | `visible`, `seasons: ChallengeSeason[]`, `selected: string`, `loading`, `error`, `onRetry()`, `onClose()`, `onSelect(id)`. Shows live/archive status, selected checkmark, loading, retry and empty states. Selection and navigation remain parent-owned. |
| `RankingScreenFrame` | `children`, `onBack()`, `onSeason()`; optional `season`, `onRefresh()`, `refreshing` (false), `resetKey`. Owns the full-screen vertical scroll, safe-area content inset, floating navigation and noninteractive soft top gradient. Changing `resetKey` remounts the scroll view. Children must not introduce another vertical scroll owner. |

The calculator uses the shared `activityConversion.ts` rules for both conversion and help text. Inputs accept a decimal point or comma, at most two fractional digits, and whole repetitions/base steps. Converted fractional steps round down; invalid, negative or excessive totals cannot be saved. Phone-step replacement asks before replacing an existing total or pending additions. Copy warns against counting activity already included in the pedometer.

Yoga/pilates is available only when the questionnaire gender resolves to `Женский` or `female` (case/whitespace normalized). `useActivityGender` reads the server-confirmed questionnaire and retains only an account-scoped verified cache offline; it does not infer gender or use the shared résumé draft. Male or unknown values omit the option and cannot convert a yoga entry. The sheet is closed when account, challenge or day changes.

## Seasons and ranking integration

`useChallengeSeasons(initialId)` loads authenticated season metadata from `/api/mobile/challenges/seasons` when opened. The response contains real IDs, season numbers, titles, start dates and completion state; loading failure exposes retry rather than invented history. Selecting a season changes the requested standings ID and closes the sheet. Account/initial-ID changes reset selection and available seasons.

Active participant rankings retain their existing team/member and period controls. Other seasons use spectator standings; completed seasons say “Итоговый рейтинг”. Spectator and final-standings routes share the new frame and selector. `ChallengeSpectatorContent` now supplies content without owning the vertical scroll; refresh belongs to the frame. The service implementation and its deployment are outside this UI record.

## Stories and evidence limits

All five new components have adjacent `.stories.tsx` files. The calculator includes Light, Dark, Male, Unknown and LargeText configurations; season button, season sheet and ranking frame include Light/Dark; HalfSheet has a default story. These are available preview cases, not proof of executed checks. Season loading/error/empty, keyboard behavior, native gestures and assistive-technology behavior are not established by the supplied captures.

The supplied evidence is a 390 × 844 React Native Web preview with fixtures in `/private/tmp/divergents119-review`: `activity-light.png`, `activity-converted.png`, `seasons-dark.png` and `ranking-scrolled-dark.png`, plus its preview source. Fixture history does not verify the live endpoint. Native phone capture was unavailable. In particular, the filename `ranking-scrolled-dark.png` does not establish that the scrolled clipping behavior was visually verified; that remains open.

Two code-review findings were resolved in code: archived-season pull-to-refresh is attached to the frame with retry for stale-data errors; the sheet's fixed-height keyboard overflow is addressed with safe top padding, `flexShrink: 1` and `minHeight: 0`. Native keyboard behavior remains unverified. These corrections are separate from visual approval. This document makes no test-pass, native certification, production-release, full accessibility or device-performance claim. Native scroll-edge, keyboard, gesture, large-text and cross-appearance review remain necessary before those properties can be accepted.
