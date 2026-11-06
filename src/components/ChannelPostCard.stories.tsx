import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelPostCard } from './ChannelPostCard';
import { articleDemo, audioDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelPostCard', component: ChannelPostCard,
  args: { post: articleDemo, author: 'Danday Amokachi', onPlay: () => {}, onReact: () => {}, onDelete: () => {} },
} satisfies Meta<typeof ChannelPostCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Article: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Audio: Story = { args: { post: audioDemo } };
export const Playing: Story = { args: { post: audioDemo, playing: true } };
export const Owner: Story = { args: { owner: true } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
