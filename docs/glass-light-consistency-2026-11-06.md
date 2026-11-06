# Glass appearance consistency · 2026-11-06

## Scope and source

Owner requested less gray glass and white action icons in both themes after build 111. Base: `origin/reading-108` at `09d3d1b62cf54408bc6afc3eade7de931c9fd5bc`. Isolated worktree `/private/tmp/divergents-glass-refinement`, branch `codex/glass-light-consistency`. Version/build remain 1.0.0/111. The primary checkout, server and participant data are untouched.

## Files and API

- `GlassSurface.tsx`: previously allowed UIKit's automatic system appearance, which could differ from the app theme. It now passes explicit light/dark, uses clearer light material, and owns navigation tint through semantic `variant`, `tone`, `emphasis`. Removed arbitrary `tint` override; existing shape/layout contract retained. Reduced Transparency stays opaque.
- `GlassButton.tsx`: previously changed action glyphs to black in light appearance. Symbols now stay white with accent-aware glass beneath them. Prominent/onWash/disabled/badge/VoiceOver behavior retained. Destructive actions have a semantic red background. GroupSlot no longer accepts an unused scheme override.
- `TabDock.tsx`: explicit app appearance; clear native glass, white light fallback, subtle brand active capsule. Routing, spring animation, mini-player, gestures and selected/idle tab-icon semantics unchanged.
- Storybook: shared primitive stories show real transparency; new isolated GlassNavigationPreview covers light, dark, Reduced Transparency and large-text states using the actual components. Preview is not a product route and makes no API calls.

## Verification

- TypeScript: passed.
- Focused regression suites: 39/39 passed.
- Full Jest: **1148/1148 passed**, 135 suites; Swift scenarios ran with their normal Clang cache.
- Storybook generation: passed.
- Native simulator Debug build: **BUILD SUCCEEDED**, Xcode 26.6, iOS 26.5 SDK/runtime, ExpoGlassEffect present. No `UIDesignRequiresCompatibility` key.
- Compared actual native components against the build-111 baseline: light, dark, light app with dark system appearance, Reduced Transparency in both themes. Default white glyphs, semantic deletion and disabled appearance confirmed.
- Impeccable independent finish reviewer: **disposition: ship**, scoped to these component captures. No remaining material fixes.

## Evidence and limits

Screenshots are direct `simctl` captures of an isolated preview with actual app components and synthetic content, not browser mockups. Baseline components came from `09d3d1b`; the preview fixture is identical except a corrected supported trash symbol in the final light capture. No generated or third-party raster assets ship with this change.

Evidence directory: `/Users/xaknazar/.codex/visualizations/2026/09/01/01a05b3e-1214-7a50-8d56-42161f3a2616/glass-light-2026-11-06/`. Includes before-light, after-light, after-dark, after-light-system-dark, after-light-reduced, after-dark-reduced, after-large and test logs. Final after-light uses `trash.fill`; earlier state captures show the old fixture's unsupported trash alias, not a production icon change.

Physical iPhone and Android were not visually tested. Full user flows and native motion were not visually reviewed; spring/nav behavior retains automated coverage. Large-text preview was captured but not included in the reviewer disposition. Existing long tab-label truncation is identical in baseline and remains outside this material-only change. iPad support is disabled in the shipping config. No build was uploaded to TestFlight for this task.

The historical design sidecar is out of sync with DESIGN.md; no broad documentation regeneration or skill update was included.


## Follow-up: full «Сообщество» tab label

The owner reported the previously documented truncation and requested a fix. The old equal-slot layout and approximate width check accepted a title that the selected bold font did not actually fit.

- `tabDockItemWidths` reserves minimum touch widths and distributes spare space using full title widths measured by native Text in the bold font. Actual measured row width constrains the result. Measurement-only text is hidden from accessibility and interaction.
- Labels remain at least 11pt with no automatic shrinking. Focus rings are overlays and do not consume text space. Full titles replace alternate «Клуб»/«Курсы»/«Работа» labels; removed unused `shortLabel` and SHORT_RU API.
- Capsule x-position and width both spring. Geometry changes and Reduced Motion remain immediate. Accessibility names remain full.
- Added CommunityCompact Storybook regression state.
- TypeScript passed; targeted 44/44 tests; full **1153/1153 tests**, 135 suites.
- Native iOS26.5 Simulator captures: `tab-label-light.png`, `tab-label-dark.png`, `tab-label-compact.png` in the evidence directory above. The compact capture constrains the real native preview to 320pt inside the 402pt simulator; it is not a separate physical phone. All show the full selected Community label with no tab-label overlap.
- No TestFlight upload, physical-device or Android visual check in this follow-up.

Follow-up finish reviewer: **disposition: ship**, limited to the corrected tab labels and supplied native captures. The 11pt minimum and full title at320/402pt were confirmed; no remaining material findings.
