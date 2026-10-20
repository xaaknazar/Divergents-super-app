import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { navigation,trip } from '../storybook/communityFixtures';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
import { CommunityTrips } from './CommunityTrips';
const meta = { title: 'Сообщество/CommunityTrips', component: CommunityTrips,
  decorators: [(Story) => <CommunityPreviewProvider participant><Story /></CommunityPreviewProvider>],
  args: { navigation, trips: [trip], error: false, onRetry: fn() },
} satisfies Meta<typeof CommunityTrips>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
