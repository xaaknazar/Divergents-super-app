import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookCover } from '../BookCover';
import { BookOverview } from '../BookOverview';
import { BookShelf } from '../BookShelf';
import { BookShelfControls } from '../BookShelfControls';
import { BookCommentCard } from '../BookCommentCard';
import { BottomBar } from '../BottomBar';
import { ChatComposer } from '../ChatComposer';
import { ChatThread } from '../ChatThread';
import { CourseOverview } from '../CourseOverview';
import { CourseProgressCard } from '../CourseProgressCard';
import { CourseAccessCard } from '../CourseAccessCard';
import { CourseIncludes } from '../CourseIncludes';
import { DetailScreen } from '../DetailScreen';
import { DownloadPlayer } from '../DownloadPlayer';
import { DownloadRow } from '../DownloadRow';
import { InlineNotice } from '../InlineNotice';
import { LessonRow } from '../LessonRow';
import { PageHeading } from '../PageHeading';
import { PlaybackSeekBar } from '../PlaybackSeekBar';
import { ProgramHistoryList } from '../ProgramHistoryList';
import { RatingControl } from '../RatingControl';
import { ReviewComposer } from '../ReviewComposer';
import { TextSection } from '../TextSection';
import { demoDetailCourse } from '../../storybook/detailFixtures';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../theme/tokens'), reduceMotion: true }) }));

type CosmeticKey = 'style' | 'className' | 'contentContainerStyle' | 'containerStyle' | 'textStyle' | 'padding' | 'backgroundColor' | 'borderRadius' | 'color' | 'textColor';
type Overrides<C extends React.ElementType> = C extends React.ElementType ? Extract<keyof React.ComponentProps<C>, CosmeticKey> : never;
type AssertNever<T extends never> = T;
type SealedDetails = AssertNever<Overrides<typeof BookCover | typeof BookOverview | typeof BookShelf | typeof BookShelfControls |
  typeof BookCommentCard | typeof BottomBar | typeof ChatComposer | typeof ChatThread | typeof CourseOverview |
  typeof CourseProgressCard | typeof CourseAccessCard | typeof CourseIncludes | typeof DetailScreen | typeof DownloadPlayer |
  typeof DownloadRow | typeof InlineNotice | typeof LessonRow | typeof PageHeading | typeof PlaybackSeekBar |
  typeof ProgramHistoryList | typeof RatingControl | typeof ReviewComposer | typeof TextSection>>;

it('seeks by touch and clamps outside the measured bar', async () => {
  const onSeek = jest.fn();
  const view = await render(<PlaybackSeekBar currentTime={20} duration={100} onSeek={onSeek} />);
  const bar = view.getByRole('adjustable');
  await fireEvent(bar, 'layout', { nativeEvent: { layout: { width: 200 } } });
  await fireEvent(bar, 'responderGrant', { nativeEvent: { locationX: 50 } });
  expect(onSeek).toHaveBeenLastCalledWith(25);
  await fireEvent(bar, 'responderMove', { nativeEvent: { locationX: 250 } });
  expect(onSeek).toHaveBeenLastCalledWith(100);
  await fireEvent(bar, 'responderMove', { nativeEvent: { locationX: -10 } });
  expect(onSeek).toHaveBeenLastCalledWith(0);
});
it.each([[95, 'increment', 100], [5, 'decrement', 0], [30, 'increment', 45], [30, 'decrement', 15]])(
  'supports bounded accessibility seek from %s using %s', async (currentTime, actionName, expected) => {
    const onSeek = jest.fn();
    const view = await render(<PlaybackSeekBar currentTime={currentTime as number} duration={100} onSeek={onSeek} />);
    await fireEvent(view.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName } });
    expect(onSeek).toHaveBeenCalledWith(expected);
  },
);
it('does not seek before duration is known', async () => {
  const onSeek = jest.fn();
  const view = await render(<PlaybackSeekBar currentTime={0} duration={0} onSeek={onSeek} />);
  await fireEvent(view.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onSeek).not.toHaveBeenCalled();
});
it('locks inaccessible lessons even if a callback was accidentally supplied', async () => {
  const onPress = jest.fn();
  const view = await render(<LessonRow lesson={demoDetailCourse.lessons[0]} state="locked" onPress={onPress} />);
  await fireEvent.press(view.getByRole('button'));
  expect(onPress).not.toHaveBeenCalled();
  await view.rerender(<LessonRow lesson={demoDetailCourse.lessons[0]} state="free" onPress={onPress} />);
  await fireEvent.press(view.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
it('exposes exactly one selected rating and blocks disabled changes', async () => {
  const onChange = jest.fn();
  const view = await render(<RatingControl value={3} onChange={onChange} />);
  expect(view.getAllByRole('button', { selected: true })).toHaveLength(1);
  await fireEvent.press(view.getByRole('button', { name: '5 из 5' }));
  expect(onChange).toHaveBeenCalledWith(5);
  await view.rerender(<RatingControl value={3} onChange={onChange} disabled />);
  await fireEvent.press(view.getByRole('button', { name: '4 из 5' }));
  expect(onChange).toHaveBeenCalledTimes(1);
});
it('keeps multiline newline separate from send and allows drafting while busy', async () => {
  const onSend = jest.fn(); const onChangeText = jest.fn();
  const view = await render(<ChatComposer value="Вопрос" onChangeText={onChangeText} onSend={onSend}
    disabled={false} busy multiline placeholder="Вопрос" />);
  const input = view.getByLabelText('Сообщение ассистенту');
  expect(input.props.multiline).toBe(true); expect(input.props.editable).toBe(true);
  await fireEvent(input, 'submitEditing');
  await fireEvent.press(view.getByRole('button', { name: 'Отправить сообщение' }));
  expect(onSend).not.toHaveBeenCalled();
  await fireEvent.changeText(input, 'Следующий вопрос');
  expect(onChangeText).toHaveBeenCalledWith('Следующий вопрос');
});
it('preserves cancel editing and prevents empty review sends', async () => {
  const onSend = jest.fn(); const onCancelEdit = jest.fn();
  const view = await render(<ReviewComposer value="  " onChange={() => {}} onSend={onSend} sending={false}
    kind="review" editing onCancelEdit={onCancelEdit} />);
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить' }));
  expect(onSend).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Отменить изменение' }));
  expect(onCancelEdit).toHaveBeenCalledTimes(1);
});
