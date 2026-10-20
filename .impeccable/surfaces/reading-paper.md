# Reading: Тишина и бумага

Scope: Reading community card and challenge header. Mode: Operate.

## Direction contract

THESIS: replace the heavy blue filled hero with quiet neutral surfaces and a carefully engraved open book, while keeping the reading task and next action explicit.

OWN-WORLD: retain Divergents blue, light/dark semantic colours and Gotham Rounded. Delicate original navy/silver book engraving with blue ribbon, generous whitespace, subtle outline and quiet arrow action; no external style overrides.

STORY: recognise Reading challenge, see the actual title and status, open the current reading action or team recruitment. Continuous mode says daily reading, without “Без срока” or “Без даты окончания”. Scheduled start, duration and elapsed-day progress remain factual.

FIRST VIEWPORT: community card text left and book right with a separated footer action; header has book above-right and wrapping live title beneath. The card places art in its own row below 350 logical units of measured card width or above a combined system/app font scale of 1.15. The header always stacks. Mock sample title is now the real, specifically renamed challenge: "Extreme reading" Challenge. Both components render the live title and do not rename other challenges.

FORM: explicitly user-selected option 1 on 2026-10-20, followed by requested text changes and authorisation to implement/release. No new seed: narrow refinement with user-pinned composition. Approved reference: /Users/xaknazar/.codex/visualizations/2026/09/01/01a05b3e-1214-7a50-8d56-42161f3a2616/reading-directions-2026-10-20/variant-1-v2.png. Reference is a two-component board, not a full native screen. Runtime statuses/actions and accessible reflow are preserved rather than replaced with static mock text.

SIGNATURE: illustration is static; native press feedback remains; no animation delays access or saving.

FINISH: native component review disposition is **ship**, with no material fixes, for the four captures listed below. Scoped rules are recorded in `DESIGN.md` and `.impeccable/design.json`; both shipping rasters carry embedded prompts and their provenance is recorded in `docs/reading-paper-2026-10-20.md`. The web hero phase remains open, so the whole-pipeline ship gate is not complete. This bounded native review does not establish physical-device/full-flow approval or pixel-diff reproduction.

## Implemented surface

- Defaults: card `feature`, header `editorial`; existing appearance alternatives are retained.
- Active semantic theme colors, Gotham Rounded and current `radius.block` remain the source of truth. There is no new global palette or radius migration.
- Card: neutral surface, one-unit outline, 20-unit insets, `title2` live title, phase/membership action in a separated footer. Text and artwork are independent native elements.
- Header: neutral surface, half-unit outline, 22-unit insets, `title1` live title, static right-aligned artwork above the text. Existing team/application actions remain in the surrounding content.
- Artwork: `ReadingBookIllustration`, separate light/dark 1536 × 1024 transparent PNGs, 3:2 contained rendering, 144-unit card or 252-unit header frame. Decoration is hidden from accessibility and ignores pointer events.
- Continuous copy: “60 минут в день” and active-header “Читаем каждый день.” The requested title remains `"Extreme reading" Challenge` for that specific live challenge.

## Native review evidence

The reviewer accepted `.impeccable/review/reading92/header-dark.png`, `card-light.png`, `card-xl.png` and `header-xl.png` as valid native component captures. Review covered the selected composition, retained brand typography and colors, engraving material, live copy/actions and large-text reflow. No material fixes were requested.

The concept reference contains two component specimens, not a whole screen. Native safe-area/full-flow behavior, physical-device interaction, all appearance alternatives and automatic screenshot reproduction were not certified by this pass. The open web hero gate is an explicit process limitation, not an inferred native visual failure. See `docs/reading-paper-2026-10-20.md` for the source and asset record.
