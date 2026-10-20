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
export const OpenWithCaptain: Story = { args: { recruiting: true, isMine: false, canJoin: true, captainName: 'Аружан',
  team: { ...readingFixture.teams[0], name: 'Vertex', occupied: 18, capacity: 22 } } };
export const Pending: Story = { args: { recruiting: true, isMine: true, pending: true, canJoin: false, captainName: 'Нурлан',
  team: { ...readingFixture.teams[0], name: 'Qarasu', occupied: 15, capacity: 20 } } };
export const Mine: Story = { args: { recruiting: true, isMine: true, canJoin: false, captainName: 'Нурлан',
  team: { ...readingFixture.teams[0], name: 'Qarasu', occupied: 16, capacity: 20 } } };
export const NoCaptainName: Story = { args: { recruiting: true, isMine: false, canJoin: true } };
export const RecruitingDark: Story = { ...OpenWithCaptain, parameters: { scheme: 'dark' } };
export const RecruitingLargeText: Story = { ...OpenWithCaptain, parameters: { viewport: 'compact', textSize: 'xl' } };
export const AverageMinutes: Story = { args: { team: { ...readingFixture.teams[0], completionRate: 0.83, averageMinutes: 64 }, isMine: false } };
