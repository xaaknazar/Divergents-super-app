import type { Meta, StoryObj } from '@storybook/react-native';
import { Checkbox } from './Checkbox';
const meta = { title: 'Основа/Checkbox', component: Checkbox,
  args: { label: 'Я ознакомился(-ась) с правилами челленджа', checked: false, onChange: () => {} } } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Unchecked: Story = {};
export const Checked: Story = { args: { checked: true } };
export const WithDescription: Story = { args: { checked: true, label: 'Напоминания', description: 'Сообщим, если до 00:00 норма не набрана' } };
export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { args: { checked: true }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
