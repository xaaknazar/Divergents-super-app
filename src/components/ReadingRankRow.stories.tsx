import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingRankRow } from './ReadingRankRow';
import { ContentBlock } from './ContentBlock';
const meta = { title: 'Reading/ReadingRankRow', component: ReadingRankRow,
  args: { place: 1, name: 'Аружан', readingDays: 14, flags: 0, pace: 41, pages: 574, last: true } } satisfies Meta<typeof ReadingRankRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Leader: Story = {};
export const ByPages: Story = { args: { metric: 'pages' } };
export const WithFlags: Story = { args: { place: 2, name: 'Нурлан', readingDays: 12, flags: 2, pace: 36.5, pages: 438 } };
export const Mine: Story = { args: { place: 31, name: 'Акназар', readingDays: 9, flags: 1, pace: 18, pages: 162, isMe: true } };
export const FirstDay: Story = { args: { place: 4, name: 'Дана', readingDays: 0, flags: 0, pace: 0, pages: 0 } };
export const List: Story = { render: () => <ContentBlock size="flush">
  <ReadingRankRow place={1} name="Аружан" readingDays={14} flags={0} pace={41} pages={574} />
  <ReadingRankRow place={2} name="Нурлан" readingDays={14} flags={2} pace={36.5} pages={511} />
  <ReadingRankRow place={3} name="Акназар" readingDays={12} flags={1} pace={30} pages={360} isMe />
  <ReadingRankRow place={4} name="Дана" readingDays={0} flags={0} pace={0} pages={0} last />
</ContentBlock> };
export const Dark: Story = { args: { flags: 3, isMe: true, metric: 'pages' }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { name: 'Константин Константинопольский', flags: 12, pace: 123456.5, pages: 123456789, isMe: true }, parameters: { textSize: 'xl', viewport: 'compact' } };
export const LargeTextByPages: Story = { ...LargeText, args: { ...LargeText.args, metric: 'pages' } };
export const OpenHistory: Story = { args: { onPress: () => {}, metric: 'pages' } };
