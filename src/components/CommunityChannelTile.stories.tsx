import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { channels } from '../storybook/communityFixtures';
import { CommunityChannelTile } from './CommunityChannelTile';
const meta = { title: 'Сообщество/CommunityChannelTile', component: CommunityChannelTile,
  args: { channel: channels[0], joined: true, unread: 3, onPress: fn() } } satisfies Meta<typeof CommunityChannelTile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Unread: Story = {};
export const Member: Story = { args: { unread: 0 } };
export const Guest: Story = { args: { channel: channels[2], joined: false, unread: 0 } };
export const Closed: Story = { args: { channel: channels[1], joined: false, unread: 0 } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
