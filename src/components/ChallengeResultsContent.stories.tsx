import type { Meta, StoryObj } from '@storybook/react-native';
import { demoResults } from '../storybook/livenFixtures';
import { finalResultsFixture } from '../storybook/challengeResultsFixtures';
import { ChallengeResultsContent } from './ChallengeResultsContent';
const meta = { title: 'Liven/ChallengeResultsContent', component: ChallengeResultsContent, 
  args: { data: demoResults, onOpenDays: () => {}, onOpenStandings: () => {}, onClaimAward: async (): Promise<boolean> => true },
} satisfies Meta<typeof ChallengeResultsContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const RejectedClaim: Story = { args: { onClaimAward: async () => false } };
export const Participant: Story = { args: { data: { ...demoResults, team: { ...demoResults.team!, isWinner: false }, me: { ...demoResults.me!, canClaimAward: false } } } };
export const FinishedSeason: Story = { args: { data: finalResultsFixture }, parameters: { scheme: 'dark' } };
