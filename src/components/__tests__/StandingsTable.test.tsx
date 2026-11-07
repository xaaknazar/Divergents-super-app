import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StandingsTable, StandingRow, rankChangeOf, shortPersonName } from '../StandingsTable';
import { ChallengeRankingCard, ChallengeRankingHeader, TodayGoals } from '../ChallengeRanking';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: ({ name }: { name: string }) => { const { Text } = require('react-native'); return <Text>{`icon:${name}`}</Text>; } }));
jest.mock('../Logo', () => ({ Logo: () => null }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn(), hTap: jest.fn() }));

const row = (id: string, rank: number, change: number | null, flags = 0, extra: Partial<StandingRow> = {}): StandingRow =>
  ({ id, name: `Команда ${id}`, rank, points: 1000 - rank, change, flags, isMine: id === 'b', ...extra });

const table = (rows: StandingRow[]) => render(<ThemePreviewProvider><StandingsTable nameColumn="Команда" rows={rows} /></ThemePreviewProvider>);

describe('StandingsTable', () => {
  it('shows how many places a row moved, up and down', async () => {
    const view = await table([row('a', 1, 0), row('b', 2, 3), row('c', 3, -1)]);
    expect(view.getByTestId('standing-move-b')).toHaveTextContent('icon:arrowtriangle.up.fill3', { exact: false });
    expect(view.getByTestId('standing-move-c')).toHaveTextContent('icon:arrowtriangle.down.fill1', { exact: false });
    expect(view.getByTestId('standing-move-a')).toHaveTextContent('–');
    expect(view.getByTestId('standing-b').props.accessibilityLabel).toContain('поднялась на 3 места');
    expect(view.getByTestId('standing-c').props.accessibilityLabel).toContain('опустилась на 1 место');
  });

  it('never prints the member count', async () => {
    const view = await table([row('a', 1, null), row('b', 2, null)]);
    expect(view.queryByText(/человек/)).toBeNull();
  });

  it('keeps flags in their own column, dash when clean', async () => {
    const view = await table([row('a', 1, 0, 0), row('b', 2, 0, 3)]);
    expect(view.getByTestId('standing-flags-a')).toHaveTextContent('–');
    expect(view.getByTestId('standing-flags-b')).toHaveTextContent('3');
  });

  it('draws the prize line after third place only', async () => {
    const view = await table([row('a', 1, 0), row('b', 2, 0), row('c', 3, 0), row('d', 4, 0)]);
    expect(view.getAllByTestId('standings-zone')).toHaveLength(1);
  });

  it('shows the team under a participant name', async () => {
    const view = await table([row('m', 1, 2, 0, { name: 'Алия', subtitle: 'Книжные черви', avatar: { uri: null } })]);
    expect(view.getByText('Книжные черви')).toBeTruthy();
    expect(view.getByTestId('standing-m').props.accessibilityLabel).toContain('поднялся на 2 места');
  });

  it('shortens a full name like Apple Sports, keeps a one-word nickname', () => {
    expect(shortPersonName('Мадина Ахметова')).toBe('Мадина А.');
    expect(shortPersonName('  Aknazar ')).toBe('Aknazar');
  });

  it('derives change from previousRank when the server omits rankChange', () => {
    expect(rankChangeOf({ rank: 2, previousRank: 6, rankChange: null })).toBe(4);
    expect(rankChangeOf({ rank: 2, previousRank: null, rankChange: null })).toBeNull();
  });
});

describe('ChallengeRankingCard', () => {
  const teams = [row('a', 1, 0)];

  it('shows teams and participants tabs, teams first, and the today value column', async () => {
    const onTab = jest.fn();
    const view = await render(<ThemePreviewProvider><ChallengeRankingCard tab="teams" onTab={onTab} rows={teams} period="overall" /></ThemePreviewProvider>);
    const tabs = view.getAllByRole('radio');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Команды', 'Участники']);
    expect(view.getByText('Команда a')).toBeTruthy();
    expect(view.queryByTestId('standing-move-a')).toBeTruthy();
    await fireEvent.press(tabs[1]);
    expect(onTab).toHaveBeenCalledWith('members');
    const today = await render(<ThemePreviewProvider><ChallengeRankingCard tab="teams" rows={[row('a', 1, null, 0, { value: '+40' })]} period="today" /></ThemePreviewProvider>);
    expect(today.getByText('+40')).toBeTruthy();
    expect(today.queryByTestId('standing-move-a')).toBeNull();
  });

  it('shows the season capsule only when the server sends it', async () => {
    const withSeason = await render(<ThemePreviewProvider><ChallengeRankingHeader season={3} /></ThemePreviewProvider>);
    expect(withSeason.getByText('Сезон 3')).toBeTruthy();
    const without = await render(<ThemePreviewProvider><ChallengeRankingHeader season={null} /></ThemePreviewProvider>);
    expect(without.queryByTestId('ranking-season')).toBeNull();
  });

  it('reads today goals aloud: done, failed and not yet marked', async () => {
    const t = (id: string, kind: 'metric' | 'binary', title: string, value: number, target: number | null, completed: boolean, marked: boolean) =>
      ({ id, kind, title, icon: 'book.fill' as const, unit: id === 'reading' ? 'стр.' : id === 'steps' ? 'шагов' : '', target, value, done: completed, marked, completed });
    const view = await render(<ThemePreviewProvider><TodayGoals tasks={[
      t('reading', 'metric', '20 страниц книги', 24, 20, true, true), t('sugar', 'binary', 'День без сахара', 0, null, false, true),
      t('steps', 'metric', '10 000 шагов', 0, 10000, false, false)]} /></ThemePreviewProvider>);
    expect(view.getByTestId('today-goals').props.accessibilityLabel)
      .toBe('Чтение 24 из 20 выполнено, Без сахара не выполнено, Активность 0 из 10000 не отмечено');
  });
});

it('medals decorate only numbered places, and team rows never have avatars', async () => {
  const view = await table([row('a',1,2), row('b',2,-1), row('c',3,0), row('d',4,null)]);
  for(const rank of [1,2,3]) expect(view.getByTestId(`rank-medal-${rank}`)).toBeTruthy();
  expect(view.queryByTestId('rank-medal-4')).toBeNull();
  expect(view.getByTestId('standing-d').props.accessibilityLabel).toContain('нет данных для сравнения');
});
