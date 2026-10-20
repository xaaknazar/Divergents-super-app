import type { Meta,StoryObj } from '@storybook/react-native';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

const meta = { title: 'Заявки/ApplicationStatusBadge', component: ApplicationStatusBadge,
  args: { status: 'pending' }, argTypes: {
    status: { control: 'select', options: ['pending', 'approved', 'rejected', 'going', 'cancelled'] },
    context: { control: 'select', options: ['application', 'event', 'participation'] },
  },
} satisfies Meta<typeof ApplicationStatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Approved: Story = { args: { status: 'approved' } };
export const Rejected: Story = { args: { status: 'rejected' } };
export const Event: Story = { args: { context: 'event' } };
export const Going: Story = { args: { context: 'event', status: 'going' } };
export const Cancelled: Story = { args: { context: 'event', status: 'cancelled' } };
export const Participation: Story = { args: { context: 'participation' } };
export const UnknownServerState: Story = { args: { status: 'future-status' } };
export const Dark: Story = { args: { status: 'approved' }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { context: 'participation' }, parameters: { textSize: 'xl', viewport: 'compact' } };
