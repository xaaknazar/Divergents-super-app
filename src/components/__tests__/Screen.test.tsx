import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Screen } from '../Screen';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { AudioPlaybackContext, AudioTrackContext, useOptionalAudioPlayer, useOptionalAudioTrack, type AudioPlayerValue, type AudioTrack } from '../../state/audioPlayerValue';
import { createTypography } from '../../theme/tokens';
import { tabDockContentInset, tabDockMiniPlayerHeight } from '../../lib/tabDockLayout';

// This fails immediately if layout code imports the playback implementation.
jest.mock('expo-video', () => { throw new Error('Screen must not import native video playback'); });
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
let mockDimensions = { width: 390, height: 844, fontScale: 1, scale: 3 };
let mockDimensionReads = 0;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => {
  mockDimensionReads += 1;
  return mockDimensions;
} }));
jest.mock('../Aurora', () => ({ Aurora: () => null }));
const audio: AudioPlayerValue = { track: { lessonId: 'demo', courseTitle: 'Курс', title: 'Урок', uri: 'file:///demo', kind: 'download' },
  currentTime: 0, duration: 60, isPlaying: true, player: {} as AudioPlayerValue['player'],
  play: jest.fn(), openLesson: jest.fn(), pause: jest.fn(), toggle: jest.fn(), seekTo: jest.fn(), seekBy: jest.fn(), clear: jest.fn() };
beforeEach(() => { mockDimensions = { width: 390, height: 844, fontScale: 1, scale: 3 }; mockDimensionReads = 0; });
const contentStyle = (view: Awaited<ReturnType<typeof render>>) => {
  const scroll = view.container.queryAll(node => node.props.contentContainerStyle !== undefined)[0];
  if (!scroll) throw new Error('Screen scroll content was not rendered');
  return StyleSheet.flatten(scroll.props.contentContainerStyle);
};

test('standalone Screen reserves dock space without importing native playback', async () => {
  const v = await render(<ThemePreviewProvider><Screen><Text>Содержимое</Text></Screen></ThemePreviewProvider>);
  expect(contentStyle(v)).toMatchObject({ paddingTop: 44, paddingBottom: tabDockContentInset(34) });
});
test('Screen observes the lightweight shared context and clears extra space when the player closes', async () => {
  const content = (track: AudioTrack | null) => <ThemePreviewProvider><AudioTrackContext.Provider value={track}>
    <Screen><Text>Содержимое</Text></Screen></AudioTrackContext.Provider></ThemePreviewProvider>;
  const v = await render(content(audio.track));
  const ty = createTypography(1), height = tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight!, ty.caption2.lineHeight!, 1);
  expect(contentStyle(v).paddingBottom).toBe(tabDockContentInset(34, height));
  await v.rerender(content(null));
  expect(contentStyle(v).paddingBottom).toBe(tabDockContentInset(34));
});
test('large system text reserves the taller player, while a no-tab screen keeps only its safe area', async () => {
  mockDimensions.fontScale = 2;
  const content = (tabPadding: boolean) => <ThemePreviewProvider><AudioTrackContext.Provider value={audio.track}>
    <Screen tabPadding={tabPadding}><Text>Содержимое</Text></Screen></AudioTrackContext.Provider></ThemePreviewProvider>;
  const v = await render(content(true));
  const ty = createTypography(1), height = tabDockMiniPlayerHeight(ty.footnoteEm.lineHeight!, ty.caption2.lineHeight!, 2);
  expect(contentStyle(v).paddingBottom).toBe(tabDockContentInset(34, height));
  await v.rerender(content(false));
  expect(contentStyle(v).paddingBottom).toBe(34);
});

test('playback ticks update controls without rerendering track-only layout subscribers', async () => {
  const layoutRender = jest.fn();
  const controlsRender = jest.fn();
  const Layout = React.memo(function Layout() {
    const track = useOptionalAudioTrack();
    layoutRender(track);
    return <Screen><Text>{track?.title ?? 'Нет трека'}</Text></Screen>;
  });
  const Controls = React.memo(function Controls() {
    const playback = useOptionalAudioPlayer();
    controlsRender(playback?.currentTime);
    return <Text>{playback?.currentTime}</Text>;
  });
  // Only playback changes; keep the theme value and the child tree stable as in
  // AudioPlayerProvider, so this does not measure unrelated theme updates.
  const children = <ThemePreviewProvider><Layout /><Controls /></ThemePreviewProvider>;
  const content = (value: AudioPlayerValue) => <AudioPlaybackContext.Provider value={value}>
    <AudioTrackContext.Provider value={value.track}>{children}</AudioTrackContext.Provider>
  </AudioPlaybackContext.Provider>;
  const v = await render(content(audio));
  const initialLayoutRenders = layoutRender.mock.calls.length;
  const initialControlsRenders = controlsRender.mock.calls.length;
  const initialScreenRenders = mockDimensionReads;
  for (const currentTime of [0.4, 0.8, 1.2]) await v.rerender(content({ ...audio, currentTime }));
  expect(layoutRender).toHaveBeenCalledTimes(initialLayoutRenders);
  expect(mockDimensionReads).toBe(initialScreenRenders);
  expect(controlsRender.mock.calls.length).toBe(initialControlsRenders + 3);
  await v.rerender(content({ ...audio, track: null, currentTime: 1.2 }));
  expect(layoutRender).toHaveBeenCalledTimes(initialLayoutRenders + 1);
  expect(contentStyle(v).paddingBottom).toBe(tabDockContentInset(34));
});
