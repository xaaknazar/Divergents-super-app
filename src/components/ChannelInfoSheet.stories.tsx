import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelInfoSheet } from './ChannelInfoSheet';
import { channelDetailDemo, channelViewActions } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelInfoSheet', component: ChannelInfoSheet,
  args: { channel: channelDetailDemo, ...channelViewActions, onClose: () => {} },
} satisfies Meta<typeof ChannelInfoSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Owner: Story = { args: { owner: true, channel: { ...channelDetailDemo, access: 'request' }, requestCount: 3 } };
