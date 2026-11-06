---
version: 1
slug: "src-screens-community-serverchannelscreen-tsx"
primary_target: "src/screens/community/ServerChannelScreen.tsx"
related_targets: ["src/components/ChannelCard.tsx","src/components/ChannelDetailView.tsx","src/screens/community/ChannelsScreen.tsx"]
---

# Community channels — Telegram reference

Scope: discovery rows, channel list, channel feed and channel information. Mode: Read / Operate.
The user rejected the Apple Podcasts treatment and pinned six Telegram screenshots. This replaces that surface direction; the rest of Divergents stays unchanged.

## Direction contract
THESIS: a channel opens directly into messages. Navigation floats above the feed.
OWN-WORLD: compact messenger rows, circular avatars, system type, left-aligned message bubbles, date separators, small reaction pills. Dark neutral surfaces with blue accents; equivalent light theme. Glass only for floating controls.
STORY: find a channel → read latest messages → react/listen/share → tap title for information and owner tools.
FIRST VIEWPORT: back button left, channel-name/subscriber capsule centre, circular avatar right; message feed immediately underneath. Floating membership/write and search actions at the bottom. Long text is fully readable without expansion.
FORM: pinned Telegram reference, code-led; no concept tournament or new-world seed. Smooth native scrolling and latest-message jump respects reduced motion. Native/system typography is explicitly part of the reference.
FINISH: independent native finish review plus updated documentation and real simulator captures. No HTML detector on React Native.

## Confirmed constraints
- User explicitly rejected the generated wallpaper: use a plain theme background, no doodles or illustrations.
- Keep real membership/private access, moderation, requests, publishing, audio and reactions.
- API currently supplies article/audio posts. Do not invent views, comments, verification, pinning, photo galleries, or notification mute state to resemble Telegram.
- No changes to other app modules, no server writes, no publication in this task.
- Reference screenshot paths are in docs/channel-telegram-design-2026-11-06.md.

## Implemented contract · 2026-11-06

`ChannelCard` is one messenger row with a circular 60pt avatar, wrapping title, two-line preview, date and genuine subscriber unread count. `CommunityChannelRow` supplies existing context data; private previews remain gated. `ChannelDetailView` opens at the latest post and composes the floating header, date dividers, full article/audio bubbles, reactions, share, search/filter and role-dependent bottom action. Information and owner tools live in `ChannelInfoSheet`; existing screen-owned API/audio handlers remain intact.

`useChannelAppearance` deliberately scopes neutral light/black grounds, blue accents and native/system typography to these channel surfaces. It uses active light/dark and app text-scale settings. This is an authorized local exception to the incumbent global appearance; do not propagate it into other modules or rewrite the global tokens. No wallpaper ships. Plain content bubbles remain opaque; glass belongs to floating controls. Message body uses 17/23pt at 1×, reactions/deletion retain 44pt targets, and measured floating-control heights reserve feed insets.

`readingNavigation` uses adaptive native regular glass and dark tint `rgba(0,0,0,0.55)` for readable enlarged labels over the feed, with the existing opaque reduced-transparency path. Other glass variants retain their behavior. Owner deletion uses the mapped `trash.fill` glyph. Reduced motion removes the information-sheet slide and latest-post scroll animation.

## Evidence and limits

Actual React Native fixture captures from iPhone Simulator iOS 26.5 are in [channels-telegram](../review/channels-telegram/): light/dark list and feed, information, private/pending, owner, and a constrained 320pt/1.25 app-text-scale case. This is component evidence with illustrative data, not physical-device or complete account-flow verification. TypeScript, Storybook generation and 33 focused tests passed. Android, physical iPhone, system accessibility-size interaction, VoiceOver and device gesture/audio behavior remain unverified; no TestFlight release was performed.

The repeated independent [review](../review/channels-telegram/review.md) records `ship`: header contrast in `phone-compact-large.png` and deletion icons in `phone-owner.png` are resolved, with no material regression observed in the affected light/dark feed captures. This verdict covers the two scored fixes within the supplied iOS 26.5 Simulator evidence; it is not a new audit of the entire surface, physical-device verification or release approval. The [implementation record](../../docs/channel-telegram-design-2026-11-06.md) owns the evidence inventory and reference paths.

`PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` and `src/theme` have no diff from worktree HEAD `4fec161`. The older global neutral/radius documentation drift is pre-existing and already noted in `DESIGN.md`; this scoped record does not refresh it.
