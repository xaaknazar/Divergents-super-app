import type { Meta, StoryObj } from '@storybook/react-native';
import { ApplicantActivityReport } from './ApplicantActivityReport';
// Fictional illustrative participation; never include live applicant data in stories.
const meta = { title: 'Applicants/Activity', component: ApplicantActivityReport,
  args: { state: 'ready', completeness: 85, onRetry: () => {}, activity: {
    applicationId: 'sample', challenges: [
      { challengeId: 'first', title: 'Divergents challenge: 1 season', teamName: 'Команда развития', startDate: '2026-09-01T04:00:00Z', status: 'finished', result: { points: 776, rank: 12, totalMembers: 80 } },
      { challengeId: 'third', title: 'Divergents challenge: 3 season', teamName: 'Команда развития', startDate: '2026-11-04T04:00:00Z', status: 'active', result: { points: 240, rank: 24, totalMembers: 120 } },
    ], reading: [{ challengeId: 'reading', title: 'Extreme Reading', teamName: null, level: 'extreme', joinedAt: '2026-10-20T07:00:00Z', status: 'active',
      result: { pages: 514, elapsedMs: 54000000, completedDays: 9, readingDays: 10, averagePages: 51.4, flags: 0 } }],
  } },
} satisfies Meta<typeof ApplicantActivityReport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl', scheme: 'dark' } };
export const Loading: Story = { args: { state: 'loading', activity: null } };
export const Unavailable: Story = { args: { state: 'error', activity: null, completeness: null } };
export const Empty: Story = { args: { activity: { applicationId: 'sample', challenges: [], reading: [] }, completeness: 0 } };
export const Partial: Story = { args: { activity: { ...meta.args.activity, challenges: [{ ...meta.args.activity.challenges[0], result: null }] } } };
