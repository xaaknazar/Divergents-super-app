import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ContentEmptyState } from './ContentEmptyState';
const meta = { title: 'Компоненты/ContentEmptyState', component: ContentEmptyState,
  
  args: { error: false, icon: 'calendar', title: 'Пока нет событий', subtitle: 'Новые встречи появятся здесь', onRetry: fn() },
} satisfies Meta<typeof ContentEmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
