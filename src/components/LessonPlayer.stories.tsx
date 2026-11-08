import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { useVideoPlayer } from 'expo-video';
import { LessonPlayer, type LessonPlayerProps } from './LessonPlayer';

function LessonPlayerPreview(args: Omit<LessonPlayerProps, 'player'>) {
  const player = useVideoPlayer(null);
  return <LessonPlayer {...args} player={player} />;
}

const meta = {
  title: 'Обучение/LessonPlayer', component: LessonPlayerPreview,
  args: { lessonNumber: 1, title: 'Паранойяльный психотип', state: 'demo', onMinimize: fn() },
} satisfies Meta<typeof LessonPlayerPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Demo: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Locked: Story = { args: { state: 'locked' } };
export const Unavailable: Story = { args: { state: 'unavailable' } };
export const NativeControls: Story = { args: { state: 'ready' } };
export const LargeText: Story = { args: { state: 'unavailable' }, parameters: { viewport: 'compact', textSize: 'xl' } };

export const WidePhone: Story = { args: { state: 'ready' }, parameters: { canvasLayout: 'screen', viewport: 'phone' } };
export const Tablet: Story = { args: { state: 'ready' }, parameters: { canvasLayout: 'screen', viewport: 'tablet' } };
