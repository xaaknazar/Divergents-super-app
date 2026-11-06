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
export const TeamsNarrow: Story = { parameters: { viewport: 'compact' } };
export const MembersNarrow: Story = { args: Members.args, parameters: { viewport: 'compact' } };
export const LargeScores: Story = {
  args: { nameColumn: 'Участник', rows: [
    { ...members[0], rank: 123, points: 1234567, change: 120, flags: 12 },
    { ...members[1], rank: 124, points: 998765, change: -12, flags: 4 },
  ] }, parameters: { viewport: 'compact', textSize: 'xl', scheme: 'dark' },
};

const readingRows: StandingRow[] = [
  { ...member('r1', 'Алия', '17 дней чтения', 1, 1005, null), value: '1 005', secondary: '59,1' },
  { ...member('r2', 'Бекназар', '15 дней чтения', 2, 838, null, 2), value: '838', secondary: '55,9' },
  { ...member('r3', 'Александра', '14 дней чтения', 3, 761, null, 4, true), value: '761', secondary: '54,4' },
];
export const ReadingPages: Story = {
  args: { nameColumn: 'Участник', rows: readingRows, showMove: false, valueColumn: 'Стр.', secondaryColumn: 'Стр/день' },
};
export const ReadingPace: Story = {
  args: { ...ReadingPages.args, valueColumn: 'Стр/день', secondaryColumn: 'Стр.',
    rows: readingRows.map(row => ({ ...row, value: row.secondary, secondary: row.value })) },
};
export const ReadingNarrow: Story = { args: ReadingPages.args, parameters: { viewport: 'compact' } };
export const ReadingLargeText: Story = { args: ReadingPace.args, parameters: { viewport: 'compact', textSize: 'xl', scheme: 'dark' } };
