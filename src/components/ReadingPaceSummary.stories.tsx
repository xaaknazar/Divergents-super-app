import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingPaceSummary } from './ReadingPaceSummary';
import { continuousReadingFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Pace', component: ReadingPaceSummary, args: { member: continuousReadingFixture.me! } } satisfies Meta<typeof ReadingPaceSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const BelowGoal: Story = { args: { member: { ...continuousReadingFixture.me!, averageMinutes: 42, pace: 'below_target' } } };
export const Observation: Story = { args: { member: { ...continuousReadingFixture.me!, rankingEligible: false, qualificationDaysLeft: 7, daysParticipated: 3 } } };
export const Today: Story = { args: { day: 12 } };
export const TodayBelowGoal: Story = { args: { day: 12, member: { ...continuousReadingFixture.me!, averageMinutes: 54, pace: 'below_target',
  history: continuousReadingFixture.me!.history.map(h => h.day === 12 ? { ...h, elapsedMs: 18 * 60000 } : h) } } };
export const TodayDark: Story = { args: { day: 12 }, parameters: { scheme: 'dark' } };
export const TodayLargeText: Story = { args: { day: 12 }, parameters: { viewport: 'compact', textSize: 'xl' } };
export const Scheduled: Story = { args: { day: 1, member: { ...continuousReadingFixture.me!, averageMinutes: undefined, pace: undefined } } };
