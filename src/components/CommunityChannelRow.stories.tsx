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
const withPicture = { ...channel, avatar: 'https://picsum.photos/seed/divergents-channel/600/400' };
/** На главной: круглый аватар, название и превью публикации. */
export const Cover: Story = { args: { channel: withPicture } };
export const CoverDark: Story = { args: { channel: withPicture }, parameters: { scheme: 'dark' } };
export const CoverLargeText: Story = { args: { channel: withPicture }, parameters: { textSize: 'xl', viewport: 'compact' } };
export const CoverPortrait: Story = { args: { channel: { ...withPicture, avatar: 'https://picsum.photos/seed/divergents-channel/400/600' } } };
export const CoverSquare: Story = { args: { channel: { ...withPicture, avatar: 'https://picsum.photos/seed/divergents-channel/600/600' } } };
/** Без картинки сохраняется композиция с инициалом канала. */
export const CoverWithoutPicture: Story = { args: {  } };
