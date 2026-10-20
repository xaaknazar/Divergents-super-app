import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingApplicantProfile } from './ReadingApplicantProfile';
import { readingApplicantFixture } from '../storybook/readingApplicantFixtures';
const meta = { title: 'Reading/Applicant profile', component: ReadingApplicantProfile,
  args: { applicant: readingApplicantFixture, onRetry: () => {} },
} satisfies Meta<typeof ReadingApplicantProfile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Saved: Story = { args: { applicant: { ...readingApplicantFixture, profileStatus: 'snapshot' } } };
export const Unavailable: Story = { args: { applicant: { ...readingApplicantFixture, profile: null, profileStatus: 'unavailable' } } };
