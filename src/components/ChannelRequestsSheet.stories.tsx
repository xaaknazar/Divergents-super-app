import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChannelRequestsSheet } from './ChannelRequestsSheet';
const meta = { title: 'Каналы/ChannelRequestsSheet', component: ChannelRequestsSheet,
  args: { visible: true, requests: [{ userId: 'u1', name: 'Демо · Алия', detail: 'demo@example.com · MBTI ENFJ' }, { userId: 'u2', name: 'Демо · Тимур', detail: 'timur@example.com' }],
    onApprove: fn(), onReject: fn(), onClose: fn() } } satisfies Meta<typeof ChannelRequestsSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Requests: Story = {};
export const Deciding: Story = { args: { busyId: 'u1' } };
export const Empty: Story = { args: { requests: [] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
