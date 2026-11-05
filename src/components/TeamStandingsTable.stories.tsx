import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { TeamStandingsTable } from './TeamStandingsTable';
import { Wrapper } from './Wrapper';
import type { TeamStanding } from '../data/community';

const team = (id: string, name: string, rank: number, points: number, previousRank: number | null, flags = 0, isMine = false): TeamStanding =>
  ({ id, name, rank, points, previousRank, rankChange: previousRank == null ? null : previousRank - rank, flags, isMine, members: 5 });

const teams: TeamStanding[] = [
  team('t1', 'Книжные черви', 1, 2480, 1, 2),
  team('t2', 'Без сахара', 2, 2310, 3, 2, true),
  team('t3', 'Шагомеры', 3, 2105, 2),
  team('t4', 'Ранние пташки', 4, 1990, 6, 3),
  team('t5', 'Divergents 2', 5, 1820, 4, 1),
  team('t6', 'Команда 6', 6, 1410, 5, 4),
];

const meta = {
  title: 'Челлендж/TeamStandingsTable', component: TeamStandingsTable,
  args: { teams, caption: 'День 9 из 21 · изменения со вчера' },
  decorators: [(Story) => <Wrapper marginHorizontal={16} marginTop={6}><Story /></Wrapper>],
} satisfies Meta<typeof TeamStandingsTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const FirstDay: Story = { args: { caption: 'День 1 из 21', teams: teams.map(t => ({ ...t, previousRank: null, rankChange: null })) } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
