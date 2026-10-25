import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelReactions } from './ChannelReactions';
const meta = { title: 'Каналы/ChannelReactions', component: ChannelReactions,
  args: { options: ['👍', '❤️', '🔥', '👏', '🙏'], counts: { '👍': 14, '🔥': 6 }, mine: '🔥', onReact: fn() } } satisfies Meta<typeof ChannelReactions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Used: Story = {};
export const None: Story = { args: { counts: {}, mine: null } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
