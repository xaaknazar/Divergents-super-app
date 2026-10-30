import type { Meta, StoryObj } from '@storybook/react-native';

import { BookAdvisorCard } from './BookAdvisorCard';
const meta = { title: 'Liven/BookAdvisorCard', component: BookAdvisorCard, 
  args: { onPress: () => {} },
} satisfies Meta<typeof BookAdvisorCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
