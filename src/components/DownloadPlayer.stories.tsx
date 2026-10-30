import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { DownloadPlayer } from './DownloadPlayer';
const meta = { title: 'Liven/Details/DownloadPlayer', component: DownloadPlayer,
  args: { title: 'Демо · Как оставаться последовательным', courseTitle: 'Путь к привычке', playing: true, currentTime: 128, duration: 602, onToggle: () => {}, onSeek: () => {} },
} satisfies Meta<typeof DownloadPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Paused: Story = { args: { playing: false } };
export const LoadingMetadata: Story = { args: { currentTime: 0, duration: 0, playing: false } };
