import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { EventApplicationsRow } from './EventApplicationsRow';
const meta = { title: 'Сообщество/EventApplicationsRow', component: EventApplicationsRow,
  args: { canManage: true, pendingCount: 2, onPress: fn() },
} satisfies Meta<typeof EventApplicationsRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const NoPending: Story = { args: { pendingCount: 0 } };
export const Participant: Story = { args: { canManage: false } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' }, args: { pendingCount: 120 } };
