import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { Text,View } from 'react-native';
import { fn } from 'storybook/test';
import { TappableSurface } from './TappableSurface';

const meta = { title: 'Основа/TappableSurface', component: TappableSurface,
  args: { accessibilityLabel: 'Открыть', onPress: fn(),
    children: <View style={{ padding: 16 }}><Text>Блок-ссылка с мягкой тенью</Text></View> },
} satisfies Meta<typeof TappableSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
