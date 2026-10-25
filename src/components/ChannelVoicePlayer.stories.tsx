import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelVoicePlayer } from './ChannelVoicePlayer';
const meta = { title: 'Каналы/ChannelVoicePlayer', component: ChannelVoicePlayer, args: { seed: 'p-2', playing: false, onToggle: fn() } } satisfies Meta<typeof ChannelVoicePlayer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Idle: Story = {};
export const Playing: Story = { args: { playing: true } };
export const Dark: Story = { args: { playing: true }, parameters: { scheme: 'dark' } };
