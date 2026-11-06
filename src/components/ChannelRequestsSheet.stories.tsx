import type { Meta, StoryObj } from '@storybook/react-native';
import { ChannelRequestsSheet } from './ChannelRequestsSheet';
const meta = { title: 'Сообщество/ChannelRequestsSheet', component: ChannelRequestsSheet,
  parameters: { canvasLayout: 'screen' }, args: { requests: [], onClose: () => {}, onApprove: () => {}, onReject: () => {} },
} satisfies Meta<typeof ChannelRequestsSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
