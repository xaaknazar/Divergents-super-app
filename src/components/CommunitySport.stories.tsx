import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { navigation,sport } from '../storybook/communityFixtures';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
import { CommunitySport } from './CommunitySport';
const meta = { title: 'Сообщество/CommunitySport', component: CommunitySport,
  decorators: [(Story) => <CommunityPreviewProvider participant><Story /></CommunityPreviewProvider>],
  args: { navigation, sport: [sport], error: false, onRetry: fn() },
} satisfies Meta<typeof CommunitySport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
