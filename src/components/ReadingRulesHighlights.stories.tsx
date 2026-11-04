import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingRulesHighlights } from './ReadingRulesHighlights';
const meta = { title: 'Reading/ReadingRulesHighlights', component: ReadingRulesHighlights,
  args: { targetMinutes: 60, flagRecoveryDays: 5, eliminationFlags: 5 } } satisfies Meta<typeof ReadingRulesHighlights>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Moderate: Story = { args: { targetMinutes: 30 } };
