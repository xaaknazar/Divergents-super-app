---
name: Divergents Super App
description: "Implemented Liven adaptation in Divergents blue: outlined groups, illustrated progress and attached navigation; migration and native visual verification remain incomplete."
colors:
  light-brand: "#234088"
  light-brand-accent: "#3D5BDB"
  light-brand-text: "#234088"
  light-on-brand: "#FFFFFF"
  light-brand-tint: "rgba(61,91,219,0.13)"
  light-brand-tint-strong: "rgba(61,91,219,0.2)"
  dark-brand: "#3D5BDB"
  dark-brand-accent: "#8AA0FF"
  dark-brand-text: "#8AA0FF"
  dark-on-brand: "#FFFFFF"
  dark-brand-tint: "rgba(138,160,255,0.18)"
  dark-brand-tint-strong: "rgba(138,160,255,0.28)"
  light-system: "#FFFFFF"
  light-grouped: "#F3F5F7"
  light-secondary: "#EEF1F4"
  light-card: "#FFFFFF"
  light-card-border: "rgba(0,0,0,0.08)"
  light-label: "#101D2C"
  light-label-secondary: "#5C5C60"
  light-label-tertiary: "#6B6B70"
  light-fill-tertiary: "rgba(118,118,128,0.12)"
  light-separator: "rgba(60,60,67,0.20)"
  dark-system: "#07121D"
  dark-grouped: "#07121D"
  dark-secondary: "#182632"
  dark-card: "#182632"
  dark-card-border: "rgba(255,255,255,0.08)"
  dark-tertiary: "#233440"
  dark-label: "#F5F7FB"
  dark-label-secondary: "#C7CBD4"
  dark-label-tertiary: "#A6ABB5"
  dark-fill-tertiary: "rgba(130,140,170,0.15)"
  dark-separator: "rgba(255,255,255,0.10)"
  light-success: "#34C759"
  light-success-text: "#187A32"
  light-danger: "#FF3B30"
  light-danger-text: "#C5221F"
  light-warning: "#FF9500"
  light-warning-text: "#934900"
  dark-success: "#30D158"
  dark-success-text: "#73E28D"
  dark-danger: "#FF453A"
  dark-danger-text: "#FF8A83"
  dark-warning: "#FF9F0A"
  dark-warning-text: "#FFC266"
  on-status: "#000000"
  reading-light-ink: "#000000"
  reading-dark-paper: "#161B26"
typography:
  largeTitle: { fontFamily: "GothamRnd-Bold", fontSize: "34px", lineHeight: "41px", letterSpacing: "0px" }
  title1: { fontFamily: "GothamRnd-Bold", fontSize: "28px", lineHeight: "34px", letterSpacing: "0px" }
  title2: { fontFamily: "GothamRnd-Bold", fontSize: "22px", lineHeight: "28px", letterSpacing: "0px" }
  title3: { fontFamily: "GothamRnd-Bold", fontSize: "20px", lineHeight: "25px", letterSpacing: "0px" }
  headline: { fontFamily: "GothamRnd-Bold", fontSize: "17px", lineHeight: "22px", letterSpacing: "-0.2px" }
  body: { fontFamily: "GothamRnd-Book", fontSize: "17px", lineHeight: "24px", letterSpacing: "-0.2px" }
  callout: { fontFamily: "GothamRnd-Book", fontSize: "16px", lineHeight: "22px", letterSpacing: "-0.2px" }
  subhead: { fontFamily: "GothamRnd-Book", fontSize: "15px", lineHeight: "20px", letterSpacing: "-0.1px" }
  subheadEm: { fontFamily: "GothamRnd-Bold", fontSize: "15px", lineHeight: "20px", letterSpacing: "-0.1px" }
  footnote: { fontFamily: "GothamRnd-Book", fontSize: "13px", lineHeight: "18px", letterSpacing: "0px" }
  footnoteEm: { fontFamily: "GothamRnd-Bold", fontSize: "13px", lineHeight: "18px", letterSpacing: "0px" }
  caption1: { fontFamily: "GothamRnd-Book", fontSize: "12px", lineHeight: "16px", letterSpacing: "0px" }
  caption2: { fontFamily: "GothamRnd-Medium", fontSize: "11px", lineHeight: "14px", letterSpacing: "0px" }
  caption2Em: { fontFamily: "GothamRnd-Bold", fontSize: "11px", lineHeight: "14px", letterSpacing: "0px" }
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  block: "20px"
  input: "16px"
  action: "16px"
  pill: "999px"
  reading-block: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-solid:
    backgroundColor: "{colors.light-brand}"
    textColor: "{colors.light-on-brand}"
    typography: "{typography.headline}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
  button-tinted:
    backgroundColor: "{colors.light-brand-tint}"
    textColor: "{colors.light-brand-text}"
    typography: "{typography.headline}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.light-brand-text}"
    typography: "{typography.headline}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.light-brand-text}"
    typography: "{typography.headline}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
  content-block:
    backgroundColor: "{colors.light-card}"
    rounded: "{rounded.block}"
    padding: "18px"
  content-block-compact:
    backgroundColor: "{colors.light-card}"
    rounded: "{rounded.block}"
    padding: "14px"
  content-block-flush:
    backgroundColor: "{colors.light-card}"
    rounded: "{rounded.block}"
    padding: "0px"
  list-section:
    backgroundColor: "{colors.light-card}"
    rounded: "{rounded.block}"
    padding: "0px"
  list-row:
    textColor: "{colors.light-label}"
    typography: "{typography.body}"
    padding: "14px 16px"
  search-field:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-label}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
  chip:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-label}"
    typography: "{typography.footnoteEm}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-active:
    backgroundColor: "{colors.light-brand-tint}"
    textColor: "{colors.light-brand-text}"
    typography: "{typography.footnoteEm}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  tab-dock:
    backgroundColor: "{colors.light-card}"
    rounded: "20px 20px 0px 0px"
  chat-composer:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-label}"
    typography: "{typography.body}"
    rounded: "{rounded.block}"
    padding: "6px 6px 6px 16px"
  profile-summary:
    backgroundColor: "{colors.light-card}"
    rounded: "{rounded.block}"
    padding: "18px"
  field-trigger:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-label}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "14px"
  progress-ring:
    textColor: "{colors.light-label}"
    typography: "{typography.headline}"
    width: "80px"
    height: "80px"
  progress-ring-compact:
    textColor: "{colors.light-label}"
    typography: "{typography.footnoteEm}"
    width: "64px"
    height: "64px"
  reading-card-paper:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.reading-light-ink}"
    typography: "{typography.title2}"
    rounded: "{rounded.reading-block}"
    padding: "20px"
  reading-card-paper-dark:
    backgroundColor: "{colors.reading-dark-paper}"
    textColor: "{colors.dark-label}"
    typography: "{typography.title2}"
    rounded: "{rounded.reading-block}"
    padding: "20px"
  reading-header-paper:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.reading-light-ink}"
    typography: "{typography.title1}"
    rounded: "{rounded.reading-block}"
    padding: "22px"
  reading-header-paper-dark:
    backgroundColor: "{colors.reading-dark-paper}"
    textColor: "{colors.dark-label}"
    typography: "{typography.title1}"
    rounded: "{rounded.reading-block}"
    padding: "22px"
  reading-card-footer:
    textColor: "{colors.light-brand-text}"
    typography: "{typography.subheadEm}"
    padding: "12px 0px 0px"
  reading-book-card:
    width: "144px"
    height: "96px"
  reading-book-header:
    width: "252px"
    height: "168px"
---

# Design System: Divergents Super App

## Overview

**Creative North Star: "Liven progress and accomplishment adapted to Divergents"**

Liven is the user-selected global visual authority, replacing Revolut Business. The implemented shared language combines compact outlined groups, rounded rectangular actions, illustrated learning and accomplishment, and quiet attached navigation. Divergents blue/navy, Gotham Rounded, Russian content, both appearances and the five destinations remain established commitments.

This document describes the current code in `src/theme`, `src/components` and the migrated screens. It does not claim that every route has completed the new visual language. The sports flows retain their selected task hierarchy and creation flows retain their confirmation behavior, now expressed through the Liven shared layer. The [direction contract](docs/liven-direction-contract.md), [PRODUCT.md](PRODUCT.md) and [implementation report](docs/liven-redesign-2026-10-08.md) record the approved scope and remaining work.

Native visual verification is incomplete. The [finish disposition](.impeccable/review/liven-status.md) is RECAPTURE because valid native captures were unavailable; Simulator control timed out. The implementation handoff reports 58 passing Jest suites / 425 tests, passing TypeScript and Storybook generation, and successful iOS and Android production JavaScript exports. These are not native builds, visual or motion approval, or release approval. The boundary audit still reports 2,427 findings across 51 screens; 90 of 108 component files have stories, with 18 legacy files missing stories. Reference study covered all 279 static Liven screens through Mobbin MCP and the signed-in browser; only two actual animation clips were analysed from 25 available recordings. Static coverage does not establish motion coverage.

The 2026-10-20 Reading extension adds the user-selected “Тишина и бумага” card and header within this incumbent system. Only `reading-*` tokens and the explicitly scoped Reading guidance below were reconciled against current code. The older global neutral colors and radius values have pre-existing drift and remain a historical record pending a separate refresh; they must not override `src/theme` when implementing Reading. The [surface brief](.impeccable/surfaces/reading-paper.md) and [implementation record](docs/reading-paper-2026-10-20.md) distinguish the bounded native component review from the still-open web hero process and wider app verification.

**Key Characteristics:**

- Compact outlined content groups and rounded rectangular actions, with circles reserved for icons, portraits and progress.
- Retained semantic light and dark palettes, accent personalization and Gotham Rounded hierarchy.
- Original blue illustrations supporting real learning, progress and completion states.
- Attached five-tab navigation, safe-area handling and text-size-aware shared controls.
- Partial migration documented from code; native visual and motion acceptance remain pending.

## Colors

The retained palette combines Divergents navy and blue with light neutral or dark blue-grey surfaces. The frontmatter records reused colors from the default `divergents` accent resolved through `resolveThemePalette()`, not every available source color or a change to the personalized accents.

### Primary

The `light-brand` / `dark-brand` pair fills primary actions. The `*-brand-text` pair colors links, selected icons and progress; `*-on-brand` supplies foreground contrast on solid actions. Accent and translucent tint roles support selected chips, tinted actions and portrait fallbacks.

`src/theme/tokens.ts` retains the base palettes. `src/theme/ThemeContext.tsx` resolves the six brand roles from `src/theme/personalization.ts`; the runtime tint uses the selected accent with alpha 0.13 / 0.20 in light mode and 0.18 / 0.28 in dark mode. Base tint literals therefore differ from the resolved frontmatter values. The app and `ThemePreviewProvider` now use this same resolver. Preview stories fix the accent to Divergents and disable Aurora; they do not reproduce all personalized backgrounds.

### Neutral

`*-grouped` is the page ground, `*-card` holds content groups and `*-secondary` supports secondary surfaces. The dark ground is navy, not literal black. Label roles establish emphasis. `*-card-border` gives ordinary groups, lists and the dock a subtle edge; `*-separator` supports internal divisions and the resting search field.

### Semantic status colors

Success, warning and danger retain separate fill and text roles. Their `on-status` foreground comes from `onGreen`, `onOrange` and `onRed`. LMS sky and emerald roles remain in source for course content and status treatments; they are not replacement brand colors. No green rebranding was introduced.

**The Active Theme Rule.** Read colors and scaled typography from `useTheme()` so light/dark appearance, accent personalization and text-size preferences remain effective.

### Reading paper extension

The scoped `reading-light-ink` and `reading-dark-paper` values record current `T.label` and dark `T.cardBg`, which differ from the older global record above. Reading uses the active `T.cardBg`, `T.label`, `T.labelSecondary`, `T.cardBorder`, `T.separator` and `T.brandText`; the source aliases, not fixed component colors, govern personalization. Light paper, secondary text, borders and brand ink already match the corresponding existing frontmatter entries. The two book rasters are selected by light/dark appearance and retain their authored blue ribbon; they are not recolored for personalized accents.

## Typography

Gotham Rounded is the incumbent brand face, loaded through Expo fonts. Native styles select `GothamRnd-Book`, `GothamRnd-Medium` and `GothamRnd-Bold` files rather than synthesizing numeric weights. `FONT.light` remains available but is not part of the canonical type ramp.

The frontmatter retains the actual source roles. `largeTitle` supplies prominent totals and display hierarchy; `title1` through `title3` support result, section and content titles. The component named `NavBarLarge` now uses `title2`, as does `NavHeader` when its large-title option is enabled. `headline` serves controls; body, callout and subhead serve readable content; footnotes and captions support metadata. Section headings retain normal case.

The YAML uses `px` for portability; native values are React Native logical units. The scale is the 1× baseline. `createTypography()` applies the app's 0.92, 1.00, 1.12 and 1.24 presets, rounds sizes and line heights, and floors the small captions at 11. Native scaling remains enabled except where a component calculates the system scale itself. `nums` or explicit tabular figures stabilize live totals, program results and aligned metrics.

**The Readable Label Rule.** Let Russian titles and action labels wrap or use the component's documented compact-label behavior; do not shrink text ad hoc to make a fixed layout fit.

Reading uses `title2` for the catalog title and `title1` for the header title, with `subhead` category text, `callout` daily-reading copy, `footnote` status and `subheadEm` footer actions. These all come from scaled `ty`. The live title wraps without a line limit. The retained “Reading challenge” category and the specifically requested `"Extreme reading" Challenge` title are user-approved copy for this surface; they do not authorize replacing Russian copy elsewhere or renaming other challenges.

## Layout

`Screen` provides the grouped ground, optional Aurora, top safe area and scroll behavior. Scrolling screens reserve the bottom safe area plus 80 logical units when `tabPadding` is enabled; a non-scrolling screen applies its top inset and leaves the bottom arrangement to its child. AI composition separately responds to the keyboard.

`Wrapper` owns outer placement, flex, gaps and padding. `ContentBlock` owns the surface, internal padding and clipping. Common screen gutters are 16 or 20; the current migration does not enforce a universal grid across every route.

Headers stack below a width of 350 or when system font scale multiplied by app text scale exceeds 1.3. `ChallengeProgressSummary` uses the same text-scale threshold to replace its compact ring with a readable day sentence. Other components may wrap their contents; this is not evidence that every older screen has completed large-text adaptation.

`TabDock` attaches to the bottom and spans the full width. Its inner destination row caps at 620, has horizontal padding of 8, top padding of 6, and bottom padding of `max(safeAreaBottom, 8)`. It estimates label fit, tries full then supported short labels, and hides all visible labels if any still cannot fit; full accessibility labels remain. An optional mini-player sits above it with a maximum width of 596 and an eight-unit gap.

The five destinations remain Обучение, AI, Сообщество, Карта and Карьера. Feature flags may hide AI, map or career while keeping the active route visible. Profile is reached from the avatar. `navigation/TabBar.tsx` owns root-route visibility, navigation events and the mini-player. No tablet sidebar, Android navigation rail or comprehensive size-class redesign is implied by these changes.

The Reading feature card places text left and artwork right while its measured width is at least 350 and system font scale multiplied by app text scale is at most 1.15. Otherwise it stacks the header-size artwork above the text, aligned right. Before measurement, it estimates card width as window width minus 32. Card content uses 20-unit insets, a 16-unit composition gap, 12-unit copy gaps and a separated footer with a 48-unit minimum height. The editorial header always stacks its right-aligned artwork above the category, live title and subtitle, using a 16-unit gap inside 22-unit insets. Neither composition fixes the overall height.

## Elevation & Depth

Ordinary groups use a one-unit outline and tonal layering without a shadow. `ContentBlock elevated` removes the outline and applies the existing floating shadow. The attached dock is shadow-free. React Native iOS shadows and Android elevation are the source; CSS approximations in the documentation panel do not establish their native appearance.

| Native preset | Shadow color | Opacity | Radius | Offset x / y | Android elevation |
| --- | --- | --- | --- | --- | --- |
| `shadows.card` | black | 0.06 | 10 | 0 / 3 | 2 |
| `shadows.floating` | black | 0.14 | 18 | 0 / 8 | 6 |

The card preset remains in the source but is not applied by ordinary `ContentBlock`. Compact headers and the scroll edge retain blur with opaque reduced-transparency fallbacks. Aurora remains a personalized background option. Original illustration shading supplies depth inside the artwork; it does not justify shadows on every surrounding group.

**The Outlined Group Rule.** Use the shared subtle outline for ordinary content groups; reserve the floating shadow for explicitly elevated surfaces.

The Reading paper variants are flat native surfaces: a one-unit card outline, a half-unit header outline and a half-unit separator above the card action. They add no blur, gradients or native shadow. The engraving itself carries its page shading. The illustration is static; card feedback is immediate pressed opacity (0.8), with brand ink on its focus border.

## Shapes

Content and list groups use `rounded.block` with continuous corners. Buttons use `rounded.action`; search and picker triggers use the matching input geometry. Pills remain appropriate to chips, while icon actions, portraits and progress rings keep circular silhouettes.

The dock has rounded top corners and square bottom corners; its item press regions use a radius of 12. The composer uses block geometry and a circular 48-unit send action. The centered profile portrait is 88 by 88 with radius 44. These are observed component values, not additions to the shared radius scale. Native continuous corners are only approximated by CSS border-radius.

Reading's scoped `rounded.reading-block` records the current `radius.block`, preserving continuous corners and clipping. It does not change the older global radius entries. The book has no enclosing tile: its frame preserves the source's 3:2 aspect ratio, cannot exceed the available width and uses contained rendering.

## Components

The following contracts describe implemented reusable components. Older route-local styling remains migration work.

### ContentBlock and ActionBlock

`ContentBlock` provides regular, compact and flush padding as recorded in frontmatter. Its one-unit border uses `T.cardBorder` unless explicitly elevated. A nested clipped view preserves the outer shadow when elevated. It exposes no arbitrary visual override. `ActionBlock` composes it with `PressableScale`; callers use `Wrapper` for placement.

`PressableScale` moves to 0.97 while pressed and returns to 1 with a native-driver spring at speed 40 and release bounciness 5. Reduced motion keeps scale at 1 and uses pressed opacity 0.7. Explicitly disabled content uses opacity 0.45; missing actions are non-interactive.

### Button

The solid, tinted, outline and plain variants use headline text, wrapping labels, optional icons and no shadow. Tones are brand, success, warning, danger and neutral. Outline uses a one-unit stroke in the tone's ink. `selected` provides semantic state and tinted fill on non-solid variants; `expanded` exposes disclosure state without inventing a separate appearance.

Regular buttons have minimum height 52. Compact buttons use 44 on iOS and 48 on Android with reduced vertical padding; comfortable buttons increase horizontal padding to 28; large buttons have minimum height 56. These are minimums, not clipping boxes. Pressed opacity is 0.8 and explicit disabled opacity is 0.45. Loading blocks the action, announces busy, shows an indicator and retains the label. Actions retain haptic feedback.

### ListSection and ListRow

`ListSection` places an optional normal-case headline above one outlined group and an optional footnote below. The group itself has no extra vertical padding. Rows use minimum height 58, internal gap 12 and the padding in frontmatter. They support leading, title, subtitle, detail and trailing content; detail is limited to 38% width. Interactive rows announce title, subtitle and detail together and use pressed opacity 0.6.

### SearchField, field controls and Chip

`SearchField` is an outlined rounded rectangle with minimum height 52. Its resting stroke uses `T.separator`; focus changes that stroke to `T.brandText`. Horizontal padding is 14, with four units before the separate 48-unit clear target when populated. Clearing returns focus to the native input.

`FieldLabel` uses subhead emphasis with an eight-unit bottom gap; invalid labels use danger text. `FieldError` uses a polite live region, footnote text and a six-unit top gap. `FieldTrigger` uses a 52-unit minimum, a card-border stroke or danger stroke, and a trailing symbol. `BirthDateField` composes those atoms with a native date picker: Android commits a chosen date, while iOS retains a draft until confirmation. Reduced motion disables the modal slide.

`Chip` retains its pill silhouette, minimum 48-unit target and footnote emphasis. Active chips combine brand tint, brand text and brand border; inactive chips combine card fill, primary text and card border. Pressed opacity is 0.65. Missing actions expose a disabled state. `RouteModeOption` is a separate 48-unit radio control: it uses a brand-filled rounded rectangle and outlines the selected state with on-brand ink.

### TabDock and ChatComposer

`TabDock` has a subtle top border, 52-unit minimum item targets and 22-unit icons. Selection changes icon and label ink; a tint background appears only while pressed, with opacity 0.65. Its safe-area and label behavior are described in Layout. Browser previews do not establish native navigation conformance.

`ChatComposer` outlines the card surface around a native input and circular send action. The input has a 48-unit minimum height. A blank trimmed value or disabled state blocks send; the screen coordinates busy state and submission. The send action switches to tertiary fill when blocked and uses pressed opacity 0.7. Keyboard positioning belongs to the screen.

### Illustrated learning, progress and accomplishment

`MilestoneIllustration` selects original transparent trophy, book or companion artwork at compact (64), welcome (112) or celebration (176) size. It is decorative and hidden from assistive technology; meaning remains in adjacent text. Opt-in entrance fades and moves upward from 12 units while scaling from 0.88 to 1 over 420 ms with cubic-out easing. Reduced motion shows the complete static state. Asset prompts and origin are recorded in [provenance](assets/design/liven/PROVENANCE.md) and embedded in the three shipping PNGs; these are original assets, not copied Liven artwork.

`ProgressRing` uses an 80-unit or compact 64-unit circle with a five-unit stroke. Values are clamped to 0–1, non-finite values become zero, and the accessible progressbar includes the numeric value and label. Updates ease over 380 ms; reduced motion sets the value immediately. The inverse tone uses on-brand ink. `ChallengeProgressSummary` explicitly labels elapsed challenge day rather than implying a completion streak, and displays existing team points and rank.

`ProgramResultHero` centers the illustration, program title, period and total within a content group; the trophy depends on a finished program with recorded activity. `ProgramHistoryCard` combines actual totals, completed-day progress and best streak, showing its compact trophy only when every program day met the target. `ChallengeResultHero` distinguishes a winning trophy and claim action from an ordinary completion. `ChallengeResultsContent` and its authenticated `ChallengeResultsPanel` adapter compose those states with result metrics; authentication remains outside the previewable surface.

`ResultMetric` uses compact groups, a semantic symbol, tabular title text and supporting label. `TeamResultMetric` is a smaller unboxed metric. `AchievementBadgeTile` uses the outlined group, actual earned/progress state, an accessible expandable condition description and explicit navigation actions.

`SuccessCelebration` retains the existing one-shot checkmark confirmation: a 320 ms arrival plus a 620 ms ring/particle burst after 140 ms. Reduced motion removes the burst and keeps the completed mark. These timing values document code; they are not a claim of verified native motion fidelity. Saving and navigation do not wait on decorative animation.

### Books and profile

`BookCard` wraps a compact content group around a contained cover (aspect ratio 0.8, radius 12), a title, shelf status and optional real reading progress. Catalog mode includes author and available ratings/comments. Missing or failed artwork uses the compact book illustration. `BookAdvisorCard` places the companion illustration beside its readable title and description in an `ActionBlock`.

`ProfileSummary` centers the portrait, name in `title2`, supporting identity, wrapping badges and completeness progress. Image failure selects the initial fallback. This component displays supplied account data and completeness, without fabricating either.

### Reading paper card and header

`ReadingChallengeCard` uses the `feature` default and `ReadingChallengeHeader` the `editorial` default, both named “Тишина и бумага” in `readingAppearance.ts`. Existing compact and alternate header choices remain available. The card is one accessible press target; its separated arrow footer describes the supplied membership and phase rather than becoming a second nested action. Status, participation and action labels remain native text. The header is a content group with a semantic title; team and application actions remain in the surrounding challenge content.

Continuous mode shows “60 минут в день” and, in an active header, “Читаем каждый день.” without “Без срока” or “Без даты окончания”. Scheduled mode retains its factual start, duration and elapsed-day progress. Titles come from the challenge data; the approved rename is not a hardcoded replacement for every challenge.

`ReadingBookIllustration` renders separate original light/dark transparent PNG engravings with `expo-image`, `contentFit="contain"` and no entrance animation. The frame ignores pointer events and hides its decorative contents from assistive technology. Text, status and actions never become part of the raster. Both assets carry embedded generation prompts; dimensions, hashes and origin are recorded in [Reading provenance](docs/reading-paper-2026-10-20.md#asset-provenance).

**The Reading Paper Rule.** In the selected Reading variants, keep the book separate from live native text, let titles wrap and use the actual phase and membership for the next action.

The native finish reviewer returned **ship** for the four supplied Reading component captures, with no material fixes. This is a bounded component disposition, not a full-flow or physical-device claim, and not automatic pixel-diff reproduction of the two-component concept board. The web hero phase remains open; the whole-pipeline ship gate was not completed. Scope and evidence are recorded in the Reading implementation record.

The schema-2 sidecar retains ten historical HTML/CSS previews of representative primitives and progress, and adds one current Reading footer fragment. It does not reproduce the book or the complete Reading surface. These snippets resolve JS tokens to literal CSS, fall back when Gotham Rounded is unavailable and include documentation-only browser hover/focus states. They are approximations, not native screenshots, functional application controls or visual QA evidence. Its eight-step OKLCH ramps are synthesized swatch aids, not runtime palette additions.

## Do's and Don'ts

### Do:

- Do apply the selected Liven language through the shared outlined groups, compact actions and existing progress components.
- Do retain the exact source palettes, both appearances, accent personalization and Gotham Rounded.
- Do use `useTheme()`, semantic component APIs and `Wrapper` for outer placement.
- Do preserve Russian copy, real progress, access rules, five-tab navigation and existing actions while migrating a surface.
- Do retain safe areas, native Back behavior, accessible labels, reduced motion and reduced transparency.
- Do distinguish elapsed days, completed days and actual streaks in progress presentations.
- Do keep illustration meaning in adjacent text and retain shipping asset provenance.
- Do keep Reading's selected paper composition, authored book and wrapping live title within the scoped card and header.

### Don't:

- Don't restore the superseded Revolut world or treat the documentation previews as native visual authority.
- Don't replace the retained navy/blue palette with Liven green, copy its artwork or invent product claims.
- Don't hardcode default blue where the component must respond to the active theme or accent.
- Don't add local appearance overrides that bypass the shared content-group and action contracts.
- Don't make decorative animation gate saving, rewards or navigation.
- Don't describe the partial migration, passing tests or JavaScript exports as native visual approval, complete motion review or a mobile release.
- Don't infer full-flow, physical-device or pixel-diff approval from the four reviewed Reading component captures.
