import React from 'react';
import { render } from '@testing-library/react-native';
import { TeamStandingsTable, teamRankChange } from '../TeamStandingsTable';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import type { TeamStanding } from '../../data/community';

jest.mock('../SFIcon', () => ({ SF: ({ name }: { name: string }) => { const { Text } = require('react-native'); return <Text>{`icon:${name}`}</Text>; } }));

const t = (id: string, rank: number, previousRank: number | null, flags = 0): TeamStanding =>
  ({ id, name: `Команда ${id}`, rank, points: 1000 - rank, previousRank, rankChange: previousRank == null ? null : previousRank - rank, flags, isMine: id === 'b', members: 4 });

const ui = (teams: TeamStanding[]) => render(<ThemePreviewProvider><TeamStandingsTable teams={teams} caption="День 2 из 21" /></ThemePreviewProvider>);

describe('TeamStandingsTable', () => {
  it('shows how many places a team moved, up and down', async () => {
    const view = await ui([t('a', 1, 1), t('b', 2, 5), t('c', 3, 2)]);
    expect(view.getByTestId('team-move-b')).toHaveTextContent('icon:arrowtriangle.up.fill3', { exact: false });
    expect(view.getByTestId('team-move-c')).toHaveTextContent('icon:arrowtriangle.down.fill1', { exact: false });
    expect(view.getByTestId('team-move-a')).toHaveTextContent('–');
    expect(view.getByTestId('team-row-b').props.accessibilityLabel).toContain('поднялась на 3 места');
    expect(view.getByTestId('team-row-c').props.accessibilityLabel).toContain('опустилась на 1 место');
  });

  it('never prints the member count', async () => {
    const view = await ui([t('a', 1, null), t('b', 2, null)]);
    expect(view.queryByText(/человек/)).toBeNull();
  });

  it('keeps flags in their own column, dash when clean', async () => {
    const view = await ui([t('a', 1, 1, 0), t('b', 2, 2, 3)]);
    expect(view.getByTestId('team-flags-a')).toHaveTextContent('–');
    expect(view.getByTestId('team-flags-b')).toHaveTextContent('3');
  });

  it('draws the prize line after third place only', async () => {
    const view = await ui([t('a', 1, 1), t('b', 2, 2), t('c', 3, 3), t('d', 4, 4)]);
    expect(view.getAllByTestId('team-standings-zone')).toHaveLength(1);
  });

  it('derives change from previousRank when the server omits rankChange', () => {
    expect(teamRankChange({ rank: 2, previousRank: 6, rankChange: null })).toBe(4);
    expect(teamRankChange({ rank: 2, previousRank: null, rankChange: null })).toBeNull();
  });
});
