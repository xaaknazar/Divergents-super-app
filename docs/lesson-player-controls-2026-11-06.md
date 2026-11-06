# Lesson player: separate native controls and aligned actions

Prepared on 2026-11-06 in `codex/reading-ranking-spacing`, after `c14fe0f`.
Not published to TestFlight. No server changes or real course progress writes.

## Reported problem

The lesson screen rendered an absolute navigation/fullscreen overlay above a
VideoView with nativeControls enabled. Its minimize and fullscreen buttons
collided with AVKit's fullscreen/PiP/AirPlay/volume controls. The two footer
buttons independently sized their contents; the wrapped next-lesson label made
one taller than the completed-lesson button.

## Files and component boundaries

- `src/components/LessonPlayer.tsx`: owns a navigation row above the video,
  outside the entire native control area. Keeps the same shared VideoPlayer,
  native controls, fullscreen and Picture in Picture. Removes the duplicate
  app fullscreen action. Its API takes player, lesson identity, availability
  state and a minimize callback; no style overrides. Loading, locked,
  unavailable and demo states remain available.
- `src/components/LessonActions.tsx`: owns the bottom panel, safe area, equal
  width/height action row, consistent typography and padding. Completion is
  a non-interactive status instead of a disabled button. The available action
  remains next lesson, course or completion according to the existing state.
  Narrow layouts or large text switch to a vertical layout without truncation.
  Its API is state, next destination and onContinue; no style overrides.
- `src/screens/lms/VideoScreen.tsx`: assembles these components and retains all
  existing access, progress, audio-download and discussion logic. Removed
  the fullscreen ref, absolute overlay and independently sized footer buttons.
  Also removed the sheet's negative margin over the video edge.
- Both new components have Storybook entries for their states and size variants.

## Validation

- `npm run typecheck`: passed.
- LessonPlaybackControls, CourseDetailScreen and DownloadsScreen: 22 passed.
- VideoScreen integration tests: 6 passed (next lesson without resubmitting
  completion; last lesson; successful/failed completion; locked access;
  minimize without stopping shared playback or completing the lesson).
- Native iOS 26.5 simulator preview with real expo-video/AVKit and Apple's
  public sample HLS: light theme, compact 320-point dark theme with XL text.
  Header and video occupy separate bounds; footer row is aligned and the
  large-text footer stacks with complete labels.
- Preview evidence:
  `/Users/xaknazar/.codex/visualizations/2026/09/01/01a05b3e-1214-7a50-8d56-42161f3a2616/lesson-player-2026-11-06/`
  (`light.png`, `compact-dark-large.png`). These are isolated component previews,
  not a real account or a recording of the complete production lesson screen.
- Manual native-control taps could not be performed: desktop-control tool
  reported that the Mac was locked. No physical iPhone/Android check performed.

Before the next release, check native fullscreen, PiP and minimize on a phone,
then complete a test lesson and continue to the next one.
