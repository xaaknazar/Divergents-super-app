import type { Meta, StoryObj } from '@storybook/react-native';
import { individualReadingFixture } from '../storybook/readingFixtures';
import { ReadingRankingContent } from './ReadingRankingContent';
const meta = { title: 'Reading/Ranking', component: ReadingRankingContent, args: { data: individualReadingFixture, onHistory: () => {} },
  parameters: { canvasLayout: 'content' } } satisfies Meta<typeof ReadingRankingContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { data: { ...individualReadingFixture, ranking: [], me: null } } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
