import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { ActionBlock } from './ActionBlock';
import { ScreenDescription } from './ScreenDescription';
const meta = { title: 'Компоненты/ActionBlock', component: ActionBlock,
  
  args: { onPress: fn(), accessibilityLabel: 'Открыть демонстрацию', children: <ScreenDescription text="Демонстрация карточки" /> },
} satisfies Meta<typeof ActionBlock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
