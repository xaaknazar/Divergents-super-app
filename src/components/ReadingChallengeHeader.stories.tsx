import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingChallengeHeader } from './ReadingChallengeHeader';
const meta = { title: 'Reading/Header', component: ReadingChallengeHeader,
  args: { title: 'Одна книга ближе', phase: 'active', day: 5, durationDays: 21, startDate: '2026-11-01' },
} satisfies Meta<typeof ReadingChallengeHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Upcoming: Story = { args: { phase: 'upcoming' } };
export const Finished: Story = { args: { phase: 'finished' } };
export const Glass: Story = { args: { variant: 'glass', mode: 'continuous' }, parameters: { scheme: 'dark', reduceTransparency: false } };
export const Journal: Story = { args: { variant: 'journal' } };
export const Focus: Story = { args: { variant: 'focus', mode: 'continuous' } };
export const Ticket: Story = { args: { variant: 'ticket' } };
export const Split: Story = { args: { variant: 'split' } };
export const SplitLargeText: Story = { args: { variant: 'split', mode: 'continuous' }, parameters: { scheme: 'dark', viewport: 'compact', textSize: 'xl' } };
export const Cover: Story = { args: { variant: 'cover' } };
export const Community: Story = { args: { variant: 'community' } };
export const Minimal: Story = { args: { variant: 'minimal' } };
export const Compact: Story = { args: { variant: 'compact' } };
export const Paper: Story = { args: { title: '"Extreme reading" Challenge', mode: 'continuous' } };
export const PaperDark: Story = { ...Paper, parameters: { scheme: 'dark' } };
export const PaperLargeText: Story = { ...Paper, parameters: { scheme: 'dark', viewport: 'compact', textSize: 'xl' } };
export const CompactParticipant: Story = { args: { variant: 'compact', mode: 'continuous', title: '"Extreme reading" Challenge', teamName: 'Vertex' } };
export const CompactParticipantDark: Story = { ...CompactParticipant, parameters: { scheme: 'dark' } };
export const CompactParticipantLargeText: Story = { ...CompactParticipant, parameters: { viewport: 'compact', textSize: 'xl' } };
export const CompactScheduled: Story = { args: { variant: 'compact', teamName: 'Книжный клуб' } };
