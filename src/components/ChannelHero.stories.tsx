import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelHero } from './ChannelHero';
import { channelDetailDemo, channelActions } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelHero', component: ChannelHero,
  args: { channel: channelDetailDemo, ...channelActions },
} satisfies Meta<typeof ChannelHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Subscribed: Story = { args: { membership: 'approved' } };
export const Pending: Story = { args: { membership: 'requested', channel: { ...channelDetailDemo, access: 'request' } } };
export const Owner: Story = { args: { owner: true, requestCount: 4, channel: { ...channelDetailDemo, access: 'request' } } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
