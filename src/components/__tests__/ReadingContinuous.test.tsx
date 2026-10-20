import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ReadingChallengeForm } from '../ReadingChallengeForm';
import { ReadingBookHistoryCard } from '../ReadingBookHistoryCard';
import { ReadingRankRow } from '../ReadingRankRow';
import { ReadingBookField } from '../ReadingBookField';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';
import { readingStandings } from '../../data/reading';
import { matchCatalogBooks } from '../../data/readingBooks';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const noop = jest.fn();
const props = (): ReadingChallengeContentProps => ({ data: individualReadingFixture, remainingMs: 2400000, timerState: 'paused', protection: 'ready', busy: false,
  awaitingPages: true, needsRecovery: false, onPrepare: noop, onStart: noop, onPause: noop, onReport: jest.fn(), onSaveApproach: jest.fn(),
  book: { title: '', author: '', status: 'empty', verified: null, suggestions: [], pick: noop, reject: noop, manual: noop, setTitle: noop, setAuthor: noop, check: noop, edit: noop },
  onJoin: noop, onRetry: noop, onRecover: noop, onRanking: noop });
test('page report preserves its calculated continuation point', async () => {
  const p = props();
  p.data = { ...individualReadingFixture, session: { id: 's', day: 14, deviceId: 'phone', book: 'Книга', budgetMs: 3600000,
    elapsedMs: 600000, status: 'awaiting_pages', startedAt: '2026-10-19T00:00:00Z', fromPage: 21 } };
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '22');
  await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(22, 43);
});
test('standings rank by average page pace; newcomers and results under review have no place', () => {
  const rows = readingStandings(individualReadingFixture.ranking);
  expect(rows.map(r => [r.member.name, r.place])).toEqual([['Аружан', 1], ['Нурлан', 2], ['Акназар', 3], ['Дана', null], ['Ербол', null]]);
  const tie = readingStandings([{ ...rows[0].member, userId: 'a', averagePages: 10, daysParticipated: 5 }, { ...rows[0].member, userId: 'b', averagePages: 10, daysParticipated: 9 }]);
  expect(tie.map(r => r.member.userId)).toEqual(['b', 'a']);
});
test('rank row: place, reading days, flags and pace; a newcomer has no misleading place', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankRow place={2} name="Нурлан" readingDays={13} flags={2} pace={36.5} /></ThemePreviewProvider>);
  expect(v.getByText('13 дней чтения')).toBeTruthy(); expect(v.getByText('36,5')).toBeTruthy(); expect(v.getByText('стр/день')).toBeTruthy();
  expect(v.getByLabelText(/2 место\. Нурлан\..*красных флагов: 2/)).toBeTruthy();
  await v.rerender(<ThemePreviewProvider><ReadingRankRow place={null} name="Дана" readingDays={1} flags={0} pace={0} isMe waitReason="До участия в рейтинге — 9 дней" /></ThemePreviewProvider>);
  expect(v.getByText('До участия в рейтинге — 9 дней')).toBeTruthy(); expect(v.getByText('вы')).toBeTruthy();
  expect(v.queryByText('стр/день')).toBeNull();
});
test('verified book shows only title and author, no page number', async () => {
  const v = await render(<ThemePreviewProvider><ReadingBookField status="verified" title="Атомные привычки" author="Джеймс Клир"
    onChangeTitle={noop} onChangeAuthor={noop} onCheck={noop} onEdit={noop} /></ThemePreviewProvider>);
  expect(v.getByText('Атомные привычки')).toBeTruthy(); expect(v.getByText('Джеймс Клир')).toBeTruthy();
  expect(v.queryByText(/Страниц|страниц/)).toBeNull();
  expect(v.getByRole('button', { name: 'Сменить книгу: Атомные привычки' })).toBeTruthy();
});
test('catalog fallback proposes only books matching title and author', () => {
  const books = [{ key: 'ol:OL1W', title: 'Атомные привычки', author: 'Джеймс Клир' }];
  expect(matchCatalogBooks('атомные привычки', 'Клир', books)[0]?.key).toBe('ol:OL1W');
  expect(matchCatalogBooks('Атомные привычки', 'Толстой', books)).toEqual([]);
  expect(matchCatalogBooks('Привычки', '', books)).toEqual([]);
});
test('spectator cannot mark somebody else’s book completed', async () => {
  const v = await render(<ThemePreviewProvider><ReadingBookHistoryCard busy={false} onStatus={jest.fn()}
    book={{ key: 'b', title: 'Книга', author: 'Автор', coverId: null, pages: 22, elapsedMs: 3600000, nextPage: 23,
      lastReadAt: '2026-10-19T12:00:00Z', finished: false, editable: false }} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Отметить книгу прочитанной' })).toBeNull();
});
test('creation is individual: no teams, captains or duration', async () => {
  const onSubmit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={onSubmit}
    initialDraft={{ title: 'Читаем каждый день', startDate: '2199-01-01', durationDays: 21, teams: [{ name: 'Читатели', capacity: 20, captainNickname: 'Captain' }] }} /></ThemePreviewProvider>);
  expect(v.queryByLabelText('Длительность в днях')).toBeNull();
  expect(v.queryByText(/Псевдоним капитана/)).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(onSubmit).toHaveBeenCalledWith({ title: 'Читаем каждый день', startDate: '2199-01-01', durationDays: 1, mode: 'continuous', teams: [] });
});
