import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingWeekChart } from './ReadingWeekChart';
import { readingActiveYearFixture } from '../storybook/readingFixtures';
const r = readingActiveYearFixture.reader;
const meta = { title: 'Reading/Year/ReadingWeekChart', component: ReadingWeekChart,
  args: { days: r.history.slice(-7), firstDay: 1, startsAt: r.period.startsAt, targetMinutes: 60 } } satisfies Meta<typeof ReadingWeekChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Moderate: Story = { args: { targetMinutes: 30 } };
