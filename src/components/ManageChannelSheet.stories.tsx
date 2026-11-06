import type { Meta, StoryObj } from '@storybook/react-native';
import { ManageChannelSheet } from './ManageChannelSheet';
import { channelDetailDemo } from '../storybook/channelFixtures';
const meta = { title: 'Сообщество/ManageChannelSheet', component: ManageChannelSheet,
  parameters: { canvasLayout: 'screen' }, args: { channel: channelDetailDemo, getToken: async () => null, onClose: () => {}, onSaved: () => {}, onDeleted: () => {} },
} satisfies Meta<typeof ManageChannelSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Settings: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
