import type { Meta, StoryObj } from '@storybook/react-native';

import { ResumeFieldInput } from './ResumeField';
const meta = { title: 'Liven/ResumeFieldInput', component: ResumeFieldInput, 
  args: { field: { key: 'nickname', label: 'Псевдоним', type: 'text' }, value: 'Участник', onChange: () => {} },
} satisfies Meta<typeof ResumeFieldInput>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Error: Story = { args: { error: 'Этот псевдоним уже занят' } };
export const Locked: Story = { args: { locked: true, lockNote: 'Подтверждённое значение' } };
