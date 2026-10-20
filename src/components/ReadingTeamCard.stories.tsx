import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingTeamCard } from './ReadingTeamCard';
import { readingFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Team', component: ReadingTeamCard,
  args: { team: { ...readingFixture.teams[0], completionRate: 0.75 }, rank: 1, recruiting: false, isMine: true,
    canJoin: false, busy: false, onJoin: () => {}, onRoster: () => {} },
} satisfies Meta<typeof ReadingTeamCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Recruiting: Story = { args: { recruiting: true, isMine: false, canJoin: true } };
export const Full: Story = { args: { recruiting: true, isMine: false, canJoin: true, team: { ...readingFixture.teams[0], occupied: 20 } } };
