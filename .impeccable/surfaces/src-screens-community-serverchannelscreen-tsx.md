---
version: 1
slug: "src-screens-community-serverchannelscreen-tsx"
primary_target: "src/screens/community/ServerChannelScreen.tsx"
related_targets: ["src/components/ChannelCard.tsx","src/components/ChannelDetailView.tsx","src/screens/community/ChannelsScreen.tsx"]
---

# Community channels — Apple content-first refinement

Scope: channel discovery card, channel list and channel detail; Operate / Read.
A member browses familiar authors in daylight or reads posts at night. Both themes and large text must remain first-class. Preserve membership, private access, reactions, audio, owner publishing and moderation. No new API or commercial claims.

## Direction contract
THESIS: the author's artwork and words lead; remove duplicate avatars and competing counters.
OWN-WORLD: existing Divergents semantic palettes, system typography, brand tint, generous continuous corners. Glass belongs to navigation, not paragraphs.
STORY: recognize channel → understand topic / access → join or read → react / listen. Owner controls remain explicit.
FIRST VIEWPORT: community features a square intact artwork beside a wrapped title and short description, followed by one footer action. Detail has a centered 168-point artwork, full title, concise metadata and one membership action above an editorial feed.
FORM: narrow refinement in the existing Apple/HIG world, pinned by the user; no new-world seed or concept round. Native edge-back and a single clear pressed state, no decorative entrance animations. Audio shows actual play state.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

References: Apple Podcasts Mobbin 3a15ebf0-e4ac-441c-be56-f0024b82d951 (hierarchy and follow); Substack f0a14d35-6e3a-49b9-bd0f-fd25a8d86e91 (quiet feed); Apple HIG Materials. Preserve existing DESIGN.md; no new raster assets.
