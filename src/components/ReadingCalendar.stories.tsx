import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingCalendar } from './ReadingCalendar';
import { readingCalendarWeeks } from '../data/readingCalendar';
import { readingActiveYearFixture } from '../storybook/readingFixtures';
const r = readingActiveYearFixture.reader;
const weeks = readingCalendarWeeks(r.history, 1, r.period.startsAt, 12);
const meta = { title: 'Reading/Year/ReadingCalendar', component: ReadingCalendar, args: { weeks } } satisfies Meta<typeof ReadingCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
/** Первая неделя участия: дни до вступления пустые. */
export const FirstWeek: Story = { args: { weeks: readingCalendarWeeks(r.history.slice(0, 5), 1, r.period.startsAt, 12) } };
