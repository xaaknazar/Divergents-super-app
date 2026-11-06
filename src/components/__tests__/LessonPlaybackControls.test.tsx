import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { VideoPlayer } from 'expo-video';
import { LessonPlayer } from '../LessonPlayer';
import { LessonActions } from '../LessonActions';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('expo-video', () => ({ VideoView: (props: any) => {
  const { View } = require('react-native');
  return <View {...props} testID="native-player" />;
} }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('../../state/LanguageContext', () => ({ tr: (text: string) => text }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));

test('the native player keeps all video controls; minimizing only navigates and never pauses the shared player', async () => {
  const pause = jest.fn();
  const player = { pause } as unknown as VideoPlayer;
  const onMinimize = jest.fn();
  const view = await render(<ThemePreviewProvider><LessonPlayer player={player} lessonNumber={1}
    title="Первый урок" state="ready" onMinimize={onMinimize} /></ThemePreviewProvider>);
  const video = view.getByTestId('native-player');
  expect(video.props.player).toBe(player);
  expect(video.props.nativeControls).toBe(true);
  expect(video.props.allowsPictureInPicture).toBe(true);
  expect(video.props.fullscreenOptions.enable).toBe(true);
  expect(view.getAllByRole('button')).toHaveLength(1);
  expect(view.queryByRole('button', { name: 'Полноэкранный режим' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Свернуть урок' }));
  expect(onMinimize).toHaveBeenCalledTimes(1);
  expect(pause).not.toHaveBeenCalled();
});

test.each(['loading', 'locked', 'unavailable', 'demo'] as const)('no stale native video appears in %s state; minimizing remains available', async state => {
  const onMinimize = jest.fn();
  const view = await render(<ThemePreviewProvider><LessonPlayer player={{} as VideoPlayer} lessonNumber={1}
    title="Первый урок" state={state} onMinimize={onMinimize} /></ThemePreviewProvider>);
  expect(view.queryByTestId('native-player')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Свернуть урок' }));
  expect(onMinimize).toHaveBeenCalledTimes(1);
});

test.each([
  ['completed', 'lesson', 'Следующий урок'],
  ['completed', 'course', 'К программе курса'],
  ['ready', 'lesson', 'Завершить урок'],
  ['locked', 'lesson', 'К программе курса'],
] as const)('%s lesson exposes only its actionable continuation', async (state, next, label) => {
  const onContinue = jest.fn();
  const view = await render(<ThemePreviewProvider textSize="xl"><LessonActions state={state} next={next}
    onContinue={onContinue} /></ThemePreviewProvider>);
  expect(view.getAllByRole('button')).toHaveLength(1);
  expect(view.queryByRole('button', { name: 'Урок пройден' })).toBeNull();
  expect(!!view.queryByText('Урок пройден')).toBe(state === 'completed');
  await fireEvent.press(view.getByRole('button', { name: label }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});
