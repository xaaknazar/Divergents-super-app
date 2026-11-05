import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StandingsTable, StandingRow, rankChangeOf, shortPersonName } from '../StandingsTable';
import { ChallengeRankingCard, ChallengeRankingHeader } from '../ChallengeRanking';
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
  const members = [row('m', 1, 0, 0, { name: 'Алия', subtitle: 'Книжные черви', avatar: { uri: null } })];

  it('switches between teams and participants, teams first', async () => {
    const onTab = jest.fn();
    const view = await render(<ThemePreviewProvider><ChallengeRankingCard tab="teams" onTab={onTab} teams={teams} members={members} /></ThemePreviewProvider>);
    const tabs = view.getAllByRole('radio');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Команды', 'Участники']);
    expect(view.getByText('Команда a')).toBeTruthy();
    expect(view.queryByText('Алия')).toBeNull();
    await fireEvent.press(tabs[1]);
    expect(onTab).toHaveBeenCalledWith('members');
  });

  it('shows the season capsule only when the server sends it', async () => {
    const withSeason = await render(<ThemePreviewProvider><ChallengeRankingHeader season={3} /></ThemePreviewProvider>);
    expect(withSeason.getByText('Сезон 3')).toBeTruthy();
    const without = await render(<ThemePreviewProvider><ChallengeRankingHeader season={null} /></ThemePreviewProvider>);
    expect(without.queryByTestId('ranking-season')).toBeNull();
  });
});
