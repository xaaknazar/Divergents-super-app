import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingFlagRecovery } from './ReadingFlagRecovery';
const meta = { title: 'Reading/FlagRecovery', component: ReadingFlagRecovery,
  args: { flags: 2, recovery: { requiredDays: 5, progressDays: 3, daysRemaining: 2, earnedFlags: 3, forgivenFlags: 1 } },
} satisfies Meta<typeof ReadingFlagRecovery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const InProgress: Story = {};
export const OneDayLeft: Story = { args: { recovery: { ...meta.args.recovery, progressDays: 4, daysRemaining: 1 } } };
export const AllForgiven: Story = { args: { flags: 0, recovery: { requiredDays: 5, progressDays: 0, daysRemaining: 0, earnedFlags: 2, forgivenFlags: 2 } } };
export const NoFlagsYet: Story = { args: { flags: 0, recovery: { requiredDays: 5, progressDays: 0, daysRemaining: 0, earnedFlags: 0, forgivenFlags: 0 } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
