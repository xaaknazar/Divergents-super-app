import type { Meta, StoryObj } from '@storybook/react-native';

import { ProgressRing } from './ProgressRing';
const meta = { title: 'Liven/ProgressRing', component: ProgressRing, 
  args: { value: 0.45, label: '9/21', accessibilityLabel: 'День челленджа' },
} satisfies Meta<typeof ProgressRing>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Zero: Story = { args: { value: 0, label: '0/21' } };
export const Complete: Story = { args: { value: 1, label: '21/21' } };
