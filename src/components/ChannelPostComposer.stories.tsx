import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelPostComposer } from './ChannelPostComposer';
const meta = { title: 'Каналы/ChannelPostComposer', component: ChannelPostComposer,
  args: { visible: true, onClose: fn(), onPublish: async () => true } } satisfies Meta<typeof ChannelPostComposer>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Статья по умолчанию; переключатель «Голосовое» открывает запись. */
export const Article: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
