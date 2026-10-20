import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { ContentBlock } from './ContentBlock';
import { RouteModeOption } from './RouteModeOption';
const meta = { title: 'Liven/RouteModeOption', component: RouteModeOption, decorators: [(Story) => <ContentBlock><Story /></ContentBlock>],
  args: { label: 'Пешком', selected: true, onPress: () => {} },
} satisfies Meta<typeof RouteModeOption>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
