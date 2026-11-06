import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelPostBubble } from './ChannelPostBubble';
import { articleDemo, audioDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelPostBubble', component: ChannelPostBubble,
  args: { post: articleDemo, author: 'Danday Amokachi', onPlay: () => {}, onReact: () => {}, onDelete: () => {} },
} satisfies Meta<typeof ChannelPostBubble>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Article: Story = {};
export const Audio: Story = { args: { post: audioDemo } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
