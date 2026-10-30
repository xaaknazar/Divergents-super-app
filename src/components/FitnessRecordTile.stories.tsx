import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { FitnessRecordTile } from './FitnessRecordTile';
import { Wrapper } from './Wrapper';

const meta = { title: 'Профиль/FitnessRecordTile', component: FitnessRecordTile,
  args: { icon: 'figure.run', tone: 'brand', value: '8,4 км', label: 'Самая длинная пробежка', caption: '3 окт · 5′42″/км', onPress: fn(), onShare: fn() },
} satisfies Meta<typeof FitnessRecordTile>;
export default meta;
type Story = StoryObj<typeof meta>;
const Grid = () => <Wrapper dir="row" wrap gap={10}>
  <Wrapper width="47%"><FitnessRecordTile icon="figure.run" tone="brand" value="8,4 км" label="Самая длинная пробежка" caption="3 окт · 5′42″/км" onShare={fn()} /></Wrapper>
  <Wrapper width="47%"><FitnessRecordTile icon="stopwatch" tone="orange" value="5′12″" label="Лучший темп" caption="5,0 км · 27 сен" onShare={fn()} /></Wrapper>
  <Wrapper width="47%"><FitnessRecordTile icon="mountain.2.fill" tone="trip" value="6,2 км" label="Самая длинная прогулка" caption="21 сен · 1:14:30" onShare={fn()} /></Wrapper>
  <Wrapper width="47%"><FitnessRecordTile icon="chart.line.uptrend.xyaxis" tone="violet" value="64,8 км" label="Всего пройдено" caption="4 пробежки · 2 прогулки" onShare={fn()} /></Wrapper>
</Wrapper>;
export const Default: Story = {};
export const Empty: Story = { args: { value: '—', caption: 'пока нет', onPress: undefined } };
export const AllRecords: Story = { render: () => <Grid /> };
export const Dark: Story = { render: () => <Grid />, parameters: { scheme: 'dark' } };
export const LargeText: Story = { render: () => <Grid />, parameters: { textSize: 'xl', viewport: 'compact' } };
