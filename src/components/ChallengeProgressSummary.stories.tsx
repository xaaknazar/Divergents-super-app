import type { Meta, StoryObj } from '@storybook/react-native';

import { ChallengeProgressSummary } from './ChallengeProgressSummary';
const meta = { title: 'Liven/ChallengeProgressSummary', component: ChallengeProgressSummary, 
  args: { title: 'Демо · 21 день развития', day: 9, totalDays: 21, teamName: 'Демо-команда', teamPoints: 2400, pointsToday: 35, rank: 2, teamCount: 6, eliminated: false, onPress: () => {} },
} satisfies Meta<typeof ChallengeProgressSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Frozen: Story = { args: { eliminated: true } };
