import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { StandingsTable, StandingRow } from './StandingsTable';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';

const team = (id: string, name: string, rank: number, points: number, change: number | null, flags = 0, isMine = false): StandingRow =>
  ({ id, name, rank, points, change, flags, isMine });
const member = (id: string, name: string, teamName: string, rank: number, points: number, change: number | null, flags = 0, isMine = false): StandingRow =>
  ({ id, name, subtitle: teamName, avatar: { uri: null }, rank, points, change, flags, isMine });

const teams: StandingRow[] = [
  team('t1', 'Книжные черви', 1, 2480, 0, 2), team('t2', 'Без сахара', 2, 2310, 1, 2, true),
  team('t3', 'Шагомеры', 3, 2105, -1), team('t4', 'Ранние пташки', 4, 1990, 2, 3),
  team('t5', 'Divergents 2', 5, 1820, -1, 1), team('t6', 'Команда 6', 6, 1410, -1, 4),
];
const members: StandingRow[] = [
  member('m1', 'Алия Нурланова', 'Книжные черви', 1, 512, 0), member('m2', 'Акназар', 'Без сахара', 2, 498, 3, 0, true),
  member('m3', 'Тимур Ахметов', 'Шагомеры', 3, 470, -1, 1), member('m4', 'Дана Сапарова', 'Ранние пташки', 4, 455, -2, 2),
];

const meta = {
  title: 'Челлендж/StandingsTable', component: StandingsTable,
  args: { nameColumn: 'Команда', rows: teams },
  decorators: [(Story) => <Wrapper marginHorizontal={16} marginTop={6}><ContentBlock size="flush"><Story /></ContentBlock></Wrapper>],
} satisfies Meta<typeof StandingsTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Teams: Story = {};
export const Members: Story = { args: { nameColumn: 'Участник', rows: members } };
export const FirstDay: Story = { args: { rows: teams.map((t) => ({ ...t, change: null })) } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { nameColumn: 'Участник', rows: members }, parameters: { textSize: 'xl', viewport: 'compact' } };
