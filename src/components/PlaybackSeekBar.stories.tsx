import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { PlaybackSeekBar } from './PlaybackSeekBar';
const meta = { title: 'Liven/Details/PlaybackSeekBar', component: PlaybackSeekBar,
  args: { currentTime: 128, duration: 602, onSeek: () => {} },
} satisfies Meta<typeof PlaybackSeekBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Interactive: Story = { render: function InteractiveSeek() {
  const [currentTime, setTime] = useState(128);
  return <PlaybackSeekBar currentTime={currentTime} duration={602} onSeek={setTime} />;
} };
export const NoDuration: Story = { args: { currentTime: 0, duration: 0 } };
