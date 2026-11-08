# Mini-player glass capsule — 2026-11-08

Implemented the owner's iOS photo-picker primary-action reference: blue translucent capsule, white labels/symbols, circular play/pause and close targets, subtle inset playback progress. The blue treatment is consistent in both themes; Reduce Transparency uses an opaque readable blue surface. iOS 26 uses native GlassView; earlier iOS uses blur, other platforms use tinted fallback.

MiniPlayerCard owns visuals with semantic/data props and Storybook variants (playing, paused, dark, downloaded audio, compact, large text, reduced transparency). MiniPlayer retains existing navigation and audio-context callbacks. TabDock now only positions the card: its opaque/clipping wrapper was removed so the material and shadow are visible. Existing content-clearance calculation still reserves at least the card's height.

Validation: TypeScript pass; 27 TabDock/Screen/TabBar tests pass. Isolated preview on iOS 26.5 simulator inspected at normal/compact width and reduced transparency; tapping pause changed to Continue. No real account/audio data used; no physical iPhone or end-to-end audio playback verification. Preview /private/tmp/divergents-mini-player-preview.png. Temporary preview entry removed, index.js restored. Not uploaded to TestFlight in this task.
