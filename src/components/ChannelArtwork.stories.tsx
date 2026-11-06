import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelArtwork } from './ChannelArtwork';
import { channelDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ChannelArtwork', component: ChannelArtwork,
  args: { uri: channelDemo.avatar, name: channelDemo.name },
} satisfies Meta<typeof ChannelArtwork>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Card: Story = {};
export const Hero: Story = { args: { size: 'hero' } };
export const Compact: Story = { args: { size: 'compact' } };
export const NoImage: Story = { args: { uri: null } };
export const BrokenImage: Story = { args: { uri: 'https://example.invalid/missing.jpg' } };
