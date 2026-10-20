import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import type { ReadingDetail } from '../data/reading';
const member: NonNullable<ReadingDetail['me']> = { userId: 'me', name: 'Акназар', teamId: null, flags: 1, completedDays: 8, pages: 312,
  elapsedMs: 600 * 60000, extraMs: 0, eliminatedOn: null, history: [], averagePages: 41, readingDays: 9, daysParticipated: 10 };
const meta = { title: 'Reading/ReadingProgressSummary', component: ReadingProgressSummary, args: { member, todayMs: 18 * 60000 } } satisfies Meta<typeof ReadingProgressSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const BelowGoal: Story = {};
export const NotStarted: Story = { args: { todayMs: 0, member: { ...member, flags: 0 } } };
export const GoalDone: Story = { args: { todayMs: 72 * 60000, member: { ...member, flags: 0 } } };
export const HistoryOnly: Story = { args: { todayMs: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
