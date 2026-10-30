import type { Meta, StoryObj } from '@storybook/react-native';
import { finalResultsFixture } from '../storybook/challengeResultsFixtures';
import { ChallengeResultRankingRow } from './ChallengeResultRankingRow';
const meta = { title: 'Challenges/ResultRankingRow', component: ChallengeResultRankingRow,
  args: { kind: 'member', row: finalResultsFixture.overall[1] },
} satisfies Meta<typeof ChallengeResultRankingRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Member: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Team: Story = { args: { kind: 'team', row: finalResultsFixture.teams[1] } };
export const WhiteFlag: Story = { args: { kind: 'member', row: finalResultsFixture.overall[3] } };
export const Eliminated: Story = { args: { kind: 'member', row: finalResultsFixture.overall[4] } };
export const LongName: Story = { args: { kind: 'member', row: { ...finalResultsFixture.overall[1], name: 'Очень длинный псевдоним участника команды' } }, parameters: { viewport: 'compact', textSize: 'xl' } };
