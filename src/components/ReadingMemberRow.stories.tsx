import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingMemberRow } from './ReadingMemberRow';
import { readingFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Participant', component: ReadingMemberRow,
  args: { member: readingFixture.ranking[0], rank: 1, day: 1, isMe: true, phase: 'active', last: true },
} satisfies Meta<typeof ReadingMemberRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Finished: Story = { args: { phase: 'finished' } };
export const Recruiting: Story = { args: { phase: 'upcoming' } };
export const RedFlag: Story = { args: { member: { ...readingFixture.ranking[0], history: [{ day: 1, state: 'missed', pages: 0, elapsedMs: 0 }] } } };
export const Complete: Story = { args: { member: { ...readingFixture.ranking[0], history: [{ day: 1, state: 'complete', pages: 40, elapsedMs: 3600000 }] } } };
const continuous = { ...readingFixture.ranking[0], name: 'Аружан', averageMinutes: 72, daysParticipated: 14, pace: 'on_target' as const, rankingEligible: true };
export const Continuous: Story = { args: { member: continuous, isMe: false, teamName: 'Vertex' } };
export const ContinuousMe: Story = { args: { member: { ...continuous, name: 'Акназар', averageMinutes: 54, pace: 'below_target' as const }, rank: 7, teamName: 'Vertex' } };
export const Observation: Story = { args: { member: { ...continuous, name: 'Дана', rankingEligible: false, qualificationDaysLeft: 4 }, isMe: false } };
export const InReview: Story = { args: { member: { ...continuous, name: 'Ербол', rankingEligible: false, rankingPending: true }, isMe: false } };
export const WithHistory: Story = { args: { member: continuous, isMe: false, teamName: 'Vertex', onHistory: () => {} } };
export const ContinuousDark: Story = { args: { member: continuous, teamName: 'Vertex' }, parameters: { scheme: 'dark' } };
