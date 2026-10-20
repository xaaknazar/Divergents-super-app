import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChallengePicker } from './ChallengePicker';
const meta = { title: 'Сообщество/ChallengePicker', component: ChallengePicker,
  args: { challenges: [{ id: 'first', title: 'Демо · Активный челлендж' }, { id: 'second', title: 'Демо · Второй челлендж' }], selectedId: 'second', onChange: fn() },
} satisfies Meta<typeof ChallengePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
