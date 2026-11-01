import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingStatisticsContent } from './ReadingStatisticsContent';
import { readingYearHistoryFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Year/ReadingStatisticsContent', component: ReadingStatisticsContent, args: { data: readingYearHistoryFixture, onShare: () => {} } } satisfies Meta<typeof ReadingStatisticsContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
