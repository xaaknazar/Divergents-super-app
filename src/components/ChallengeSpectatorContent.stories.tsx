import type { Meta, StoryObj } from '@storybook/react-native';
import { ChallengeSpectatorContent } from './ChallengeSpectatorContent';
import { spectatorFixture } from '../storybook/challengeSpectatorFixtures';
const meta = { title: 'Challenges/Spectator', component: ChallengeSpectatorContent,
  args: { data: spectatorFixture, onRefresh: () => {} }, parameters: { canvasLayout: 'screen' },
} satisfies Meta<typeof ChallengeSpectatorContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Empty: Story = { args: { data: { ...spectatorFixture, teams: [], members: [] } } };
