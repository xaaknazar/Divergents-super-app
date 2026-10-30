import type { Meta, StoryObj } from '@storybook/react-native';
import { individualReadingFixture } from '../storybook/readingFixtures';
import { ReadingRankingContent } from './ReadingRankingContent';
const meta = { title: 'Reading/Ranking', component: ReadingRankingContent, args: { data: individualReadingFixture, onHistory: () => {} },
  parameters: { canvasLayout: 'content' } } satisfies Meta<typeof ReadingRankingContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const TotalPages: Story = { args: { initialMetric: 'pages' } };
export const DifferentLeaders: Story = { args: { data: { ...individualReadingFixture,
  ranking: individualReadingFixture.ranking.map(member => member.userId === 'r1' ? { ...member, pages: 82, daysParticipated: 2 } : member),
} } };
export const Empty: Story = { args: { data: { ...individualReadingFixture, ranking: [], me: null } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
