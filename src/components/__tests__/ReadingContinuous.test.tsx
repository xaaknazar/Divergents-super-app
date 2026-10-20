import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ReadingChallengeForm } from '../ReadingChallengeForm';
import { ReadingBookPicker } from '../ReadingBookPicker';
import { ReadingBookHistoryCard } from '../ReadingBookHistoryCard';
import { ReadingMemberRow } from '../ReadingMemberRow';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { continuousReadingFixture } from '../../storybook/readingFixtures';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const props = (): ReadingChallengeContentProps => ({ data: continuousReadingFixture, remainingMs: 2400000, timerState: 'ready', protection: 'ready', busy: false,
  awaitingPages: false, needsRecovery: false, onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(),
  onJoin: jest.fn(), onApplications: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onResolve: jest.fn() });
test('continuous visitor can apply after start but cannot start reading before approval', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const p = props(); p.data = { ...continuousReadingFixture, membership: null, me: null };
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Начать чтение' })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Подать заявку' }));
  expect(p.onJoin).not.toHaveBeenCalled();
  alert.mock.calls[0][2]?.find(button => button.text === 'Отправить заявку')?.onPress?.();
  expect(p.onJoin).toHaveBeenCalledWith('demo-team');
  alert.mockRestore();
  await fireEvent.press(v.getByRole('button', { name: 'Правила и защита' }));
  expect(v.queryByText(/Три красных флага суммарно/)).toBeNull();
  expect(v.getByText(/Пропуск отмечается в истории, но не исключает/)).toBeTruthy();
});
test('book metadata and start page reach the timer without rewriting title implicitly', async () => {
  const p = props();
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  await fireEvent.changeText(v.getByLabelText('Какую книгу читаете?'), 'Моя книга');
  await fireEvent.changeText(v.getByLabelText('Автор'), 'Автор');
  await fireEvent.changeText(v.getByLabelText('Начальная страница'), '21');
  await fireEvent.press(v.getByRole('button', { name: 'Продолжить чтение' }));
  expect(p.onStart).toHaveBeenCalledWith('Моя книга', expect.objectContaining({ author: 'Автор', fromPage: 21 }));
});
test('page report preserves its calculated continuation point', async () => {
  const p = props(); p.timerState = 'paused'; p.awaitingPages = true;
  p.data = { ...continuousReadingFixture, session: { id: 's', day: 12, deviceId: 'phone', book: 'Книга', budgetMs: 3600000,
    elapsedMs: 600000, status: 'awaiting_pages', startedAt: '2026-10-19T00:00:00Z', fromPage: 21 } };
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '22');
  await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(22, 43);
});
test('new reader is visible without a misleading rank number', async () => {
  const v = await render(<ThemePreviewProvider><ReadingMemberRow member={{ ...continuousReadingFixture.me!, rankingEligible: false, qualificationDaysLeft: 9 }}
    rank={1} day={12} isMe phase="active" last /></ThemePreviewProvider>);
  expect(v.getByLabelText('Пока без места')).toBeTruthy(); expect(v.queryByLabelText('1 место')).toBeNull();
});
test('catalog suggestions require explicit selection and editing removes catalog attribution', async () => {
  const onChange = jest.fn(), book = { key: 'ol:OL123W', title: 'Книга', author: 'Автор', coverId: 123 };
  const v = await render(<ThemePreviewProvider><ReadingBookPicker value={book} onChange={onChange} disabled={false}
    search={{ books: [book], correctedQuery: null, busy: false, search: jest.fn() }} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Выбрать: Книга, Автор' })); expect(onChange).toHaveBeenCalledWith(book);
  await fireEvent.changeText(v.getByLabelText('Какую книгу читаете?'), 'Другая');
  expect(onChange).toHaveBeenLastCalledWith({ title: 'Другая', author: 'Автор' });
});
test('spectator cannot mark somebody else’s book completed', async () => {
  const v = await render(<ThemePreviewProvider><ReadingBookHistoryCard busy={false} onStatus={jest.fn()}
    book={{ key: 'b', title: 'Книга', author: 'Автор', coverId: null, pages: 22, elapsedMs: 3600000, nextPage: 23,
      lastReadAt: '2026-10-19T12:00:00Z', finished: false, editable: false }} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Отметить книгу прочитанной' })).toBeNull();
});
test('continuous creation removes duration and retains teams/captains in payload', async () => {
  const onSubmit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={onSubmit}
    initialDraft={{ title: 'Читаем каждый день', startDate: '2199-01-01', durationDays: 21, teams: [{ name: 'Читатели', capacity: 20, captainNickname: 'Captain' }] }} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('tab', { name: 'Постоянный' }));
  expect(v.queryByLabelText('Длительность в днях')).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ mode: 'continuous', durationDays: 1,
    teams: [{ name: 'Читатели', capacity: 20, captainNickname: 'Captain' }] }));
});
