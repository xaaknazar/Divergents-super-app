import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelCard } from './ChannelCard';
import { channelDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelCard', component: ChannelCard,
  args: { channel: channelDemo, postCount: 24, onOpen: () => {} },
} satisfies Meta<typeof ChannelCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Featured: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const List: Story = { args: {} };
export const Pending: Story = { args: { membership: 'requested', channel: { ...channelDemo, access: 'request' } } };
export const Subscribed: Story = { args: { membership: 'approved', unreadCount: 3 } };
export const LongTitle: Story = { args: { channel: { ...channelDemo, name: 'Книжный клуб Divergents: читаем, обсуждаем и растём вместе', avatar: '' } }, parameters: { textSize: 'xl', viewport: 'compact' } };
