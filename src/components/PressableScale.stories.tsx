import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { PressableScale } from './PressableScale';
import { StatusBadge } from './StatusBadge';
const meta = { title: 'Основа/PressableScale', component: PressableScale, args: { onPress: fn(), accessibilityLabel: 'Открыть подробности', children: <StatusBadge label="Нажмите и удерживайте" /> },
} satisfies Meta<typeof PressableScale>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Animated: Story = { parameters: { reduceMotion: false } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const Disabled: Story = { args: { disabled: true } };
