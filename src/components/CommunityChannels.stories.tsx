import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { channelPosts, channels, navigation } from '../storybook/communityFixtures';
import { CommunityChannels } from './CommunityChannels';
import { CommunityPreviewProvider } from './CommunityPreviewProvider';
const meta = { title: 'Сообщество/CommunityChannels', component: CommunityChannels,
  decorators: [(Story) => <CommunityPreviewProvider participant channels={channels} posts={channelPosts} joined={['c-book']} unread={{ 'c-book': 2 }}><Story /></CommunityPreviewProvider>],
  args: { navigation },
} satisfies Meta<typeof CommunityChannels>;
export default meta;
type Story = StoryObj<typeof meta>;
/** «Мои каналы» сверху, остальные — ниже с подсказкой про закрытые каналы. */
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
/** Ещё ни на что не подписан. */
export const Guest: Story = { decorators: [(Story) => <CommunityPreviewProvider channels={channels}><Story /></CommunityPreviewProvider>] };
export const Empty: Story = { decorators: [(Story) => <CommunityPreviewProvider><Story /></CommunityPreviewProvider>] };
