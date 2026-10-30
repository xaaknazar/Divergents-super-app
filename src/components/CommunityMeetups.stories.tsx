import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { meetup,navigation } from '../storybook/communityFixtures';
import { CommunityMeetups } from './CommunityMeetups';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
const meta = { title: 'Сообщество/CommunityMeetups', component: CommunityMeetups,
  decorators: [(Story) => <CommunityPreviewProvider participant><Story /></CommunityPreviewProvider>],
  args: { navigation, meetups: [meetup], error: false, onRetry: fn() },
} satisfies Meta<typeof CommunityMeetups>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
