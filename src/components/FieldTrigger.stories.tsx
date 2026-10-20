import type { Meta, StoryObj } from '@storybook/react-native';

import { FieldTrigger } from './FieldTrigger';
const meta = { title: 'Liven/FieldTrigger', component: FieldTrigger, 
  args: { value: 'Алматы', placeholder: 'Выберите город', accessibilityLabel: 'Город проживания', onPress: () => {} },
} satisfies Meta<typeof FieldTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Empty: Story = { args: { value: '' } };
export const Invalid: Story = { args: { invalid: true } };
