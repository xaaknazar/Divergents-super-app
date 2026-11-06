import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelDetailView } from './ChannelDetailView';
import { channelDetailDemo, channelViewActions } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelDetailView', component: ChannelDetailView,
  parameters: { canvasLayout: 'screen' }, args: { channel: channelDetailDemo, ...channelViewActions },
} satisfies Meta<typeof ChannelDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Owner: Story = { args: { owner: true } };
export const Closed: Story = { args: { channel: { ...channelDetailDemo, access: 'request' } } };
export const Pending: Story = { args: { channel: { ...channelDetailDemo, access: 'request' }, membership: 'requested' } };
export const Empty: Story = { args: { channel: { ...channelDetailDemo, posts: [], _count: { posts: 0, members: 0 } } } };
export const Loading: Story = { args: { channel: null, loading: true } };
export const NotFound: Story = { args: { channel: null } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
