import type { Meta, StoryObj } from '@storybook/react-native';
import { CreateChannelPostSheet } from './CreateChannelPostSheet';
const meta = { title: 'Сообщество/CreateChannelPostSheet', component: CreateChannelPostSheet,
  parameters: { canvasLayout: 'screen' }, args: { channelId: 'preview-only', getToken: async () => null, onClose: () => {}, onDone: () => {} },
} satisfies Meta<typeof CreateChannelPostSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Article: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
