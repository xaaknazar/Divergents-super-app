import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { challenge,navigation } from '../storybook/communityFixtures';
import { CommunityChallenges } from './CommunityChallenges';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
const meta = { title: 'Сообщество/CommunityChallenges', component: CommunityChallenges,
  decorators: [(Story, context) => <CommunityPreviewProvider participant parallel={context.parameters.parallel}><Story /></CommunityPreviewProvider>],
  args: { navigation, challenges: [challenge], error: false, onRetry: fn() },
} satisfies Meta<typeof CommunityChallenges>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const ParallelChallenges: Story = { parameters: { parallel: true }, args: { challenges: [challenge, { ...challenge, id: 'demo-new', title: 'Демо · Новый набор', status: 'upcoming', startLabel: '12 октября' }] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
