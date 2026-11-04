import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingStatisticsContent } from './ReadingStatisticsContent';
import { readingActiveYearFixture, readingYearHistoryFixture } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Year/ReadingStatisticsContent', component: ReadingStatisticsContent, args: { data: readingYearHistoryFixture, onShare: () => {} } } satisfies Meta<typeof ReadingStatisticsContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
/** Год в процессе: 84-й день — самый частый случай. */
export const ActiveYear: Story = { args: { data: readingActiveYearFixture } };
export const ActiveYearDark: Story = { args: { data: readingActiveYearFixture }, parameters: { scheme: 'dark' } };
export const ActiveYearLargeText: Story = { args: { data: readingActiveYearFixture }, parameters: { viewport: 'compact', textSize: 'xl' } };
