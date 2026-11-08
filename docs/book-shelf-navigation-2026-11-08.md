# Books: progress controls and return navigation — 2026-11-08

## Changes

- Profile and My Books open library books in the Profile stack instead of switching to Learning. The existing catalog, detail and advisor screens are reused in both stacks. Back/edge-swipe retain the caller's stack, including Profile → My Books → Library → Book.
- Shared typed book routes replace cross-tab casts for these entry points. Other profile shortcuts (courses, etc.) are unchanged.
- BookShelfControls uses the dedicated BookProgressPicker instead of generic buttons with horizontal padding that split percentage labels. Presets have 48-point minimum height, single-line percentage text, selected and disabled states, and wrap whole controls with large text.
- Simplified status segments, consistent block spacing, and supported trash.fill symbol replace the missing trash icon fallback.
- Added Storybook picker states and a dark compact/large-text shelf example. No server or real user-data changes.

## Verification

- npm run typecheck: pass.
- 9 relevant Jest suites: 53 passed, 0 failed. Includes profile-local book/library navigation, back callback, progress saves, disabled controls, removal confirmation, rating and review actions.
- Native Storybook, existing iOS 26.5 iPhone simulator: inspected light normal text and dark 320-point compact content with XL text. Percentage labels remain intact; large text wraps whole controls.
- Captures: /tmp/book-progress-first.png and /tmp/book-progress-dark-large.png.
- Existing simulator build 111 reports a notifications keychain entitlement warning in Storybook; no real notification or user session was used. This is a component preview, not an installed release build of these changes.
- Not tested on physical iPhone, iPad or Android. Full back gesture flow on hardware remains unverified; automated tests cover screen navigation callbacks.
- Not uploaded to TestFlight in this task.

Impeccable used for narrow refinement, retaining current app styling. Its generated design sidecar is stale relative to DESIGN.md; no unrelated context rewrite was made. Installed skill v4.3.1 reports v4.8.0 available; skill upgrade was not performed during the task.
