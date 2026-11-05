import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { ChallengeRankingCard, ChallengeRankingHeader, PillToggle, TodayGoals } from './ChallengeRanking';
import { Wrapper } from './Wrapper';
import type { StandingRow } from './StandingsTable';
import type { MemberTaskProgress } from '../data/community';

const task = (id: string, kind: 'metric' | 'binary', title: string, value: number, target: number | null, completed: boolean, marked = true): MemberTaskProgress =>
  ({ id, kind, title, icon: 'book.fill', unit: id === 'steps' ? 'шагов' : id === 'reading' ? 'стр.' : '', target, value, done: completed, marked, completed });
const goals = [task('reading', 'metric', '20 страниц книги', 24, 20, true), task('sugar', 'binary', 'День без сахара', 0, null, true), task('steps', 'metric', '10 000 шагов', 6400, 10000, false)];

const teams: StandingRow[] = [
  { id: 't1', name: 'Книжные черви', rank: 1, points: 2480, change: 0, flags: 2, isMine: false },
  { id: 't2', name: 'Без сахара', rank: 2, points: 2310, change: 1, flags: 2, isMine: true },
  { id: 't3', name: 'Шагомеры', rank: 3, points: 2105, change: -1, flags: 0, isMine: false },
  { id: 't4', name: 'Ранние пташки', rank: 4, points: 1990, change: 2, flags: 3, isMine: false },
];
const members: StandingRow[] = [
  { id: 'm1', name: 'Алия Н.', subtitle: 'Книжные черви', avatar: { uri: null }, rank: 1, points: 512, change: 0, flags: 0, isMine: false },
  { id: 'm2', name: 'Акназар', subtitle: 'Без сахара', avatar: { uri: null }, rank: 2, points: 498, change: 3, flags: 0, isMine: true },
];
const today: StandingRow[] = [
  { id: 'm2', name: 'Акназар', detail: <TodayGoals tasks={goals} />, avatar: { uri: null }, rank: 1, points: 61, value: '+61', change: null, flags: 0, isMine: true },
  { id: 'm1', name: 'Алия Н.', subtitle: 'Книжные черви', avatar: { uri: null }, rank: 2, points: 40, value: '+40', change: null, flags: 0, isMine: false },
];

const meta = {
  title: 'Челлендж/ChallengeRankingCard', component: ChallengeRankingCard,
  args: { tab: 'teams', rows: teams, period: 'overall', caption: 'День 9 из 21 · изменения со вчера' },
  decorators: [(Story) => <><ChallengeRankingHeader season={3} /><Wrapper marginHorizontal={16}><Story /></Wrapper></>],
} satisfies Meta<typeof ChallengeRankingCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Teams: Story = {};
export const Members: Story = { args: { tab: 'members', rows: members,
  filter: <PillToggle label="Кого показать" items={['Все', 'Моя команда']} value={0} onChange={() => {}} /> } };
export const MembersToday: Story = { args: { tab: 'members', rows: today, period: 'today', caption: 'День 9 · очки за сегодня' } };
export const Empty: Story = { args: { rows: [] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { tab: 'members', rows: members }, parameters: { textSize: 'xl', viewport: 'compact' } };
