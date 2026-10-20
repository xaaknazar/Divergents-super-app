import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { Chip } from './Chip';

const meta = {
  title: 'Выбор/Chip', component: Chip,
  args: { label: 'Мои курсы', icon: 'book.fill', onPress: fn() },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = { args: { active: true } };
export const ReadOnly: Story = { args: { onPress: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { label: 'Все завершённые программы' }, parameters: { textSize: 'xl', viewport: 'compact' } };
