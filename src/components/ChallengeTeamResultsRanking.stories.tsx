import type { Meta, StoryObj } from '@storybook/react-native';
import { finalResultsFixture } from '../storybook/challengeResultsFixtures';
import { ChallengeTeamResultsRanking } from './ChallengeTeamResultsRanking';
const meta = { title: 'Challenges/TeamResultsRanking', component: ChallengeTeamResultsRanking,
  args: { data: finalResultsFixture },
} satisfies Meta<typeof ChallengeTeamResultsRanking>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const MissingMembers: Story = { args: { data: { ...finalResultsFixture, overall: [] } } };
export const NoTeam: Story = { args: { data: { ...finalResultsFixture, team: null } } };
