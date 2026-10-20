# Reading: «Тишина и бумага»

## Approved scope

The user selected option 1, “Тишина и бумага”, on 2026-10-20 for the native Reading community card and challenge header. The selected board was revised to remove “Без срока” and “Без даты окончания”, and to use the specific challenge title `"Extreme reading" Challenge`. The subsequent instruction authorized implementation and release. This report documents the component extension and its review; release status belongs to the release record.

The approved reference is [variant-1-v2.png](/Users/xaknazar/.codex/visualizations/2026/09/01/01a05b3e-1214-7a50-8d56-42161f3a2616/reading-directions-2026-10-20/variant-1-v2.png). It is a two-component board, not a full native screen. Earlier concept-generation metadata in `reading-design-concepts-2026-10-20.json` records an earlier approval stage; it does not supersede the later implementation instruction recorded in the surface brief.

This extension preserves Divergents navy, Gotham Rounded, semantic light/dark appearance, native text, actual challenge state and existing actions. It does not replace the global design system, rename unrelated challenges or change scoring/access rules.

## Actual implementation

Source: `src/components/ReadingChallengeCard.tsx`, `ReadingChallengeHeader.tsx`, `ReadingBookIllustration.tsx`, `src/data/readingAppearance.ts`, `src/theme/tokens.ts`, `ThemeContext.tsx` and `personalization.ts`.

| Element | Implemented contract |
| --- | --- |
| Catalog card | Default `feature`; quiet `T.cardBg`, one-unit `T.cardBorder` outline, current `radius.block` continuous corners, 20-unit insets. Text left/art right when space permits; status below and an action footer separated by a half-unit `T.separator` rule. |
| Header | Default `editorial`; `T.cardBg`, half-unit outline, current block corners, 22-unit insets. Right-aligned book above category, title and subtitle, with 16-unit vertical gaps. No primary action is embedded in the header; surrounding challenge content retains team/application controls. |
| Type | Scaled Gotham Rounded: card `title2` (22/28 baseline), header `title1` (28/34), category `subhead`, daily text `callout`, status `footnote`, card action `subheadEm`. Titles have no line cap. Native logical units are shown as portable `px` values in DESIGN frontmatter. |
| Adaptive card | Stack when measured card width is below 350 or system font scale × app text scale exceeds 1.15. Before layout, estimate width as window width minus 32. Stacked artwork uses the header frame; the header itself always stacks. |
| Artwork | Separate light/dark assets selected through `isDark`, contained 3:2 frame, nominal width 144 for card and 252 for header with `maxWidth: '100%'`. Static, decorative, no pointer events, hidden from accessibility. |
| Interaction | Whole card is one accessible button, pressed opacity 0.8, brand-colored border on focus. The footer has a minimum height of 48, an arrow and the actual action label; it is not a nested button. |
| Alternatives | Existing compact card and nine other header choices remain available. `feature`/`editorial` retain their persisted identifiers and receive the selected “Тишина и бумага” label. |

Active continuous mode shows “60 минут в день” and header copy “Читаем каждый день.” without end-date wording. Scheduled mode retains factual start dates, duration and the header's elapsed-day progress. Finished/upcoming states retain their own statuses. The title comes from API data: the approved rename applies to the specified live challenge, not a global title substitution.

Card actions remain conditional: finished → “Смотреть итоги”; pending → “Заявка на рассмотрении”; approved active → “Продолжить чтение”; unjoined active continuous → “Выбрать команду”; unjoined active scheduled → “Смотреть рейтинг”; upcoming → “Выбрать команду”. The accessibility label includes the real title, status, daily goal, any scheduled duration and action.

## Asset provenance

Both shipping illustrations are original generated extractions of the approved book motif, made with the built-in image-generation tool. The motif is a fine engraved open book with layered pages and a satin blue ribbon. Light artwork uses navy outlines and ivory paper; dark artwork uses silver-blue etched details suitable for graphite. The UI's text, titles, borders and arrows were excluded from the image prompt. No third-party book artwork was introduced.

| Shipping file | Actual file | SHA-256 |
| --- | --- | --- |
| `assets/design/reading/engraving-light.png` | PNG, 1536 × 1024, alpha channel | `f6547d68cff68622b3e9b11ea51ad6124704e049947066e1ccbca863e1eb6422` |
| `assets/design/reading/engraving-dark.png` | PNG, 1536 × 1024, alpha channel | `2fd8c16afab569d61e65bbcda3d5de91e1939e79813b93a30c2c984d34172539` |

The complete prompts are embedded in each PNG and were read back with `impeccable embed-prompt --read`. They request transparent surroundings and contain theme-specific material guidance. Although the prompt requested a square output, the actual delivered rasters are 3:2; the component uses their actual ratio. File inspection confirmed dimensions and alpha-channel presence. The implementation handoff records true transparency, including outside the book.

The concept prompts and requested text revision remain in `docs/reading-design-concepts-2026-10-20.json` and `docs/reading-design-selected-edit-2026-10-20.json`. These are historical design inputs; the component code, current title data and final assets define the implementation.

## Bounded native review

The native reviewer returned **ship**, with **no material fixes**, based on these supplied component captures:

- [Dark header](../.impeccable/review/reading92/header-dark.png)
- [Light card](../.impeccable/review/reading92/card-light.png)
- [Large-text card](../.impeccable/review/reading92/card-xl.png)
- [Large-text header](../.impeccable/review/reading92/header-xl.png)

The review accepted the persisted captures and direction evidence; retained Gotham/brand adaptation; engraved raster material; semantic surface colors; composition and accessible reflow; requested title/copy; the user-pinned category label; truthful membership-based card actions; and placement of header actions in surrounding content. It found no material omissions in the two components.

The selected board was not run through an automatic pixel-diff reproduction pass. Native composition and typography adapt to real content, logical dimensions and accessibility. The web hero phase remains open, and the finish tool correctly did not complete the whole-pipeline ship gate. That process limitation is recorded explicitly; it does not invalidate the narrower native review disposition.

This pass does not certify physical devices, complete navigation/reading/application flows, all appearance variants, screen-reader interaction, every Android/iOS size class or a production release. This documentation pass checked source values, stories, asset metadata and the supplied reviewer result; it did not launch a new visual audit. Build, test and release outcomes are tracked separately.

## Existing design-record drift

The older global Liven record in `DESIGN.md` predates this extension and differs from current theme code: examples include light grouped/secondary backgrounds and primary text; dark ground/card/tertiary surfaces; and the medium-through-block/input/action corner scale. Current Reading uses white/light ink or graphite/dark ink via the active theme, and the current block radius is 16.

Only scoped `reading-*` tokens, Reading component guidance and matching sidecar extensions were added. The older global tokens, preview snippets and migration narrative were preserved, not repaired or treated as newly verified. The sidecar's new footer fragment documents text and control styling only; it is not a reproduction of the raster illustration or complete native component.

No material Reading defects were reported by the reviewer. Pre-existing global design drift and the open web hero process remain explicit limitations rather than newly canonized design rules.
