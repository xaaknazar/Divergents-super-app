import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ReadingChallengeForm } from '../ReadingChallengeForm';
import { ReadingBookHistoryCard } from '../ReadingBookHistoryCard';
import { ReadingRankRow } from '../ReadingRankRow';
import { ReadingBookField } from '../ReadingBookField';
import { ReadingRankingContent } from '../ReadingRankingContent';
import { ReadingDiary } from '../ReadingDiary';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';
import { READING_CHALLENGE_RULES, readingStandings } from '../../data/reading';
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
test('standings rank everyone by average page pace from their first day', () => {
  const rows = readingStandings(individualReadingFixture.ranking);
  expect(rows.map(r => [r.member.name, r.place])).toEqual([['Аружан', 1], ['Нурлан', 2], ['Ербол', 3], ['Акназар', 4], ['Дана', 5]]);
  const tie = readingStandings([{ ...rows[0].member, userId: 'a', averagePages: 10, daysParticipated: 5 }, { ...rows[0].member, userId: 'b', averagePages: 10, daysParticipated: 9 }]);
  expect(tie.map(r => r.member.userId)).toEqual(['b', 'a']);
});
test('legacy waiting and review fields cannot exclude anyone; sorting does not mutate the payload', () => {
  const ranking = individualReadingFixture.ranking.map(m => ({ ...m, rankingEligible: false, rankingPending: true, qualificationDaysLeft: 10 }));
  const before = ranking.map(m => m.userId);
  const rows = readingStandings(ranking);
  expect(rows.map(r => r.place)).toEqual([1, 2, 3, 4, 5]);
  expect(ranking.map(m => m.userId)).toEqual(before);
  const newcomer = { ...ranking[0], userId: 'new', averagePages: 100, daysParticipated: 1, readingDays: 0 };
  expect(readingStandings([...ranking, newcomer])[0]).toMatchObject({ member: newcomer, place: 1 });
});
test('rank row: even a first-day reader with no pages has a place and a zero pace', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankRow place={2} name="Нурлан" readingDays={13} flags={2} pace={36.5} pages={511} /></ThemePreviewProvider>);
  expect(v.getByText('13 дней чтения')).toBeTruthy(); expect(v.getByText('36,5 стр/день')).toBeTruthy(); expect(v.getByText('стр/день')).toBeTruthy();
  expect(v.getByLabelText(/2 место\. Нурлан\..*красных флагов: 2/)).toBeTruthy();
  await v.rerender(<ThemePreviewProvider><ReadingRankRow place={5} name="Дана" readingDays={0} flags={0} pace={0} pages={0} isMe /></ThemePreviewProvider>);
  expect(v.getByLabelText(/5 место\. Дана\..*средний темп 0 стр\/день/)).toBeTruthy();
  expect(v.getByText('вы')).toBeTruthy();
  expect(v.getByText('стр/день')).toBeTruthy();
});
test('ranking explanation and rules describe first-day calendar-day pace without a review queue', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankingContent data={individualReadingFixture} /></ThemePreviewProvider>);
  expect(v.getByText(/Рейтинг доступен с первого дня/)).toBeTruthy();
  expect(v.getByText(/календарные дни участия, включая пропуски/)).toBeTruthy();
  const rules = READING_CHALLENGE_RULES.map(r => r.text).join(' ');
  expect(rules).toContain('с первого дня');
  expect(rules).toContain('Это можно сделать и до 60 минут');
  expect(rules).toContain('Время всех сохранённых подходов складывается');
  expect(rules).not.toMatch(/уходит на проверку|попадают в рейтинг не сразу|После паузы запишите/);
});
test('legacy review history stays visible without implying approval or a completed hour', async () => {
  const v = await render(<ThemePreviewProvider><ReadingDiary member={{ ...individualReadingFixture.me!,
    history: [{ day: 1, state: 'review', pages: 12, elapsedMs: 600000 }] }} /></ThemePreviewProvider>);
  expect(v.getByText('Записанные данные')).toBeTruthy();
  expect(v.getByText('10 мин · 12 стр.')).toBeTruthy();
  expect(v.queryByText('На проверке')).toBeNull();
  expect(v.queryByText('Час выполнен')).toBeNull();
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
