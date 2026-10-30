import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { navigation } from '../storybook/communityFixtures';
import { ActiveChallengeCard } from './ActiveChallengeCard';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
const meta = { title: 'Сообщество/ActiveChallengeCard', component: ActiveChallengeCard,
  decorators: [(Story) => <CommunityPreviewProvider participant><Story /></CommunityPreviewProvider>],
  args: { navigation },
} satisfies Meta<typeof ActiveChallengeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
