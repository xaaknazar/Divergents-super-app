---
version: 1
slug: "src-components-tab-dock"
primary_target: "src/components/TabDock.tsx"
related_targets: ["src/navigation/TabBar.tsx", "src/components/TabDock.stories.tsx"]
---

# Floating navigation · Waymo reference

Scope: bottom navigation only; mode: Operate. Preserve five destinations, role gates, navigation events, mini-player and brand/theme preferences. The user explicitly selected the Waymo screen at https://mobbin.com/screens/3b1c8c23-8497-41c7-bf4d-709caa97b3c3 and asked for suitable icons and a slightly translucent background. This overrides the older attached dock, not the surrounding Liven design.

## Direction contract

THESIS: a compact floating navigation capsule, with a visibly selected destination, replacing the edge-attached strip.

OWN-WORLD: Divergents blue/navy and Gotham Rounded; frosted neutral surface, inset selected pill and consistent outlined/filled Ionicons through the existing SF adapter. Both appearances remain first-class.

STORY: recognise the current section and switch using the same five actions; selection is not conveyed by colour alone.

FIRST VIEWPORT: centred capsule, 12–16 pt side gutters, safe bottom offset, 620 pt maximum width. Five equal targets at least 48 pt high, 23 pt symbols over readable compact labels. The mini-player remains above the dock. Native iOS material; subtle tinted Android fallback; opaque reduced-transparency state.

FORM: direct implementation of the exact user-pinned narrow reference, no concept roll or replacement identity. Reference is the approved visual target, not a newly generated comp. No decorative motion is added to navigation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Verification: TypeScript, navigation/appearance regression tests and isolated Storybook states. Native evidence must be distinguished from browser approximations; no publication is requested.
