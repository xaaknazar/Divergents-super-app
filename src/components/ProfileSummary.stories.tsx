import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ProfileSummary } from './ProfileSummary';
const meta = { title: 'Компоненты/ProfileSummary', component: ProfileSummary,
  
  args: { name: 'Демо-профиль', email: 'demo@example.com', completeness: 75, talent: 'MBTI · ENFP', onEdit: fn() },
} satisfies Meta<typeof ProfileSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
