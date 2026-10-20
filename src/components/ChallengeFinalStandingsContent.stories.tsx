import type { Meta, StoryObj } from '@storybook/react-native';
import { finalResultsFixture } from '../storybook/challengeResultsFixtures';
import { ChallengeFinalStandingsContent } from './ChallengeFinalStandingsContent';
const meta = { title: 'Challenges/FinalStandings', component: ChallengeFinalStandingsContent,
  args: { data: finalResultsFixture, onRefresh: () => {} },
  parameters: { canvasLayout: 'screen' },
} satisfies Meta<typeof ChallengeFinalStandingsContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Empty: Story = { args: { data: { ...finalResultsFixture, teams: [], overall: [] } } };
export const ManyParticipants: Story = { args: { data: { ...finalResultsFixture, overall: Array.from({ length: 160 }, (_, index) => ({
  ...finalResultsFixture.overall[1], id: `demo-${index}`, name: `Демо-участник ${index + 1}`, rank: index + 1, points: 1600 - index, isMe: index === 121,
})) } } };
