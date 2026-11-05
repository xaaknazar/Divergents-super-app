import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { ChallengeRankingCard, ChallengeRankingHeader } from './ChallengeRanking';
import { Wrapper } from './Wrapper';
import type { StandingRow } from './StandingsTable';

const teams: StandingRow[] = [
  { id: 't1', name: 'Книжные черви', rank: 1, points: 2480, change: 0, flags: 2, isMine: false },
  { id: 't2', name: 'Без сахара', rank: 2, points: 2310, change: 1, flags: 2, isMine: true },
  { id: 't3', name: 'Шагомеры', rank: 3, points: 2105, change: -1, flags: 0, isMine: false },
  { id: 't4', name: 'Ранние пташки', rank: 4, points: 1990, change: 2, flags: 3, isMine: false },
];
const members: StandingRow[] = [
  { id: 'm1', name: 'Алия Нурланова', subtitle: 'Книжные черви', avatar: { uri: null }, rank: 1, points: 512, change: 0, flags: 0, isMine: false },
  { id: 'm2', name: 'Акназар', subtitle: 'Без сахара', avatar: { uri: null }, rank: 2, points: 498, change: 3, flags: 0, isMine: true },
];

const meta = {
  title: 'Челлендж/ChallengeRankingCard', component: ChallengeRankingCard,
  args: { tab: 'teams', teams, members, caption: 'День 9 из 21 · изменения со вчера' },
  decorators: [(Story) => <><ChallengeRankingHeader season={3} /><Wrapper marginHorizontal={16}><Story /></Wrapper></>],
} satisfies Meta<typeof ChallengeRankingCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Teams: Story = {};
export const Members: Story = { args: { tab: 'members' } };
export const Empty: Story = { args: { teams: [], members: [] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { tab: 'members' }, parameters: { textSize: 'xl', viewport: 'compact' } };
