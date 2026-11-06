import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelReactionMenu } from './ChannelReactionMenu';
import { articleDemo, audioDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelReactionMenu', component: ChannelReactionMenu,
  parameters: { reduceMotion: false, reduceTransparency: false },
  args: { post: articleDemo, author: 'Danday Amokachi', anchor: { x: 10, y: 200, width: 330, height: 580 }, onReact: () => {}, onClose: () => {} },
} satisfies Meta<typeof ChannelReactionMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Audio: Story = { args: { post: audioDemo, anchor: { x: 10, y: 320, width: 330, height: 180 } } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const ReduceMotion: Story = { parameters: { reduceMotion: true } };
export const ReduceTransparency: Story = { parameters: { reduceTransparency: true } };
