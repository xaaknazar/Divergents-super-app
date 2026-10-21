import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingRankRow } from './ReadingRankRow';
import { ContentBlock } from './ContentBlock';
const meta = { title: 'Reading/ReadingRankRow', component: ReadingRankRow,
  args: { place: 1, name: 'Аружан', readingDays: 14, flags: 0, pace: 41, last: true } } satisfies Meta<typeof ReadingRankRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Leader: Story = {};
export const WithFlags: Story = { args: { place: 2, name: 'Нурлан', readingDays: 12, flags: 2, pace: 36.5 } };
export const Mine: Story = { args: { place: 31, name: 'Акназар', readingDays: 9, flags: 1, pace: 18, isMe: true } };
export const FirstDay: Story = { args: { place: 4, name: 'Дана', readingDays: 0, flags: 0, pace: 0 } };
export const List: Story = { render: () => <ContentBlock size="flush">
  <ReadingRankRow place={1} name="Аружан" readingDays={14} flags={0} pace={41} />
  <ReadingRankRow place={2} name="Нурлан" readingDays={14} flags={2} pace={36.5} />
  <ReadingRankRow place={3} name="Акназар" readingDays={12} flags={1} pace={30} isMe />
  <ReadingRankRow place={4} name="Дана" readingDays={0} flags={0} pace={0} last />
</ContentBlock> };
export const Dark: Story = { args: { flags: 3, isMe: true }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { name: 'Константин Константинопольский', flags: 12, pace: 128.5 }, parameters: { textSize: 'xl', viewport: 'compact' } };
