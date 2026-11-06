import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelFeedHeader } from './ChannelFeedHeader';
import { articleDemo, audioDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelFeedHeader', component: ChannelFeedHeader,
  args: { posts: [articleDemo, audioDemo], value: 'all', onChange: () => {} },
} satisfies Meta<typeof ChannelFeedHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const All: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Audio: Story = { args: { value: 'audio' } };
export const OneType: Story = { args: { posts: [articleDemo] } };
