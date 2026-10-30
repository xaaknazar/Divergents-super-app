import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingLiveActivityStatus } from './ReadingLiveActivityStatus';

const meta = {
  title: 'Reading/Live Activity status',
  component: ReadingLiveActivityStatus,
  args: { status: { state: 'missing', canRestore: true }, onRestore: () => {} },
} satisfies Meta<typeof ReadingLiveActivityStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Missing: Story = {};
export const Ended: Story = { args: { status: { state: 'ended', canRestore: true } } };
export const Disabled: Story = { args: { status: { state: 'disabled', canRestore: false } } };
export const Error: Story = { args: { status: { state: 'error', canRestore: true, error: 'Activity request failed' } } };
export const Restoring: Story = { args: { busy: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
