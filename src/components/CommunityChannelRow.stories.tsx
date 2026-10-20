import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { channel,navigation } from '../storybook/communityFixtures';
import { CommunityChannelRow } from './CommunityChannelRow';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
const meta = { title: 'Сообщество/CommunityChannelRow', component: CommunityChannelRow,
  decorators: [(Story) => <CommunityPreviewProvider participant><Story /></CommunityPreviewProvider>],
  args: { channel, navigation },
} satisfies Meta<typeof CommunityChannelRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
