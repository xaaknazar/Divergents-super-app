import type { Meta, StoryObj } from '@storybook/react-native';

import { FieldLabel } from './FieldLabel';
const meta = { title: 'Liven/FieldLabel', component: FieldLabel, 
  args: { label: 'Город проживания', required: true },
} satisfies Meta<typeof FieldLabel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Invalid: Story = { args: { invalid: true } };
