import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { readingFixture } from '../storybook/readingFixtures';
const member = { ...readingFixture.me!, completedDays: 4, pages: 152, extraMs: 1500000,
  history: Array.from({ length: 5 }, (_, i) => ({ day: i + 1, state: i === 4 ? 'open' as const : 'complete' as const, pages: 30, elapsedMs: 3900000 })) };
const meta = { title: 'Reading/Progress', component: ReadingProgressSummary, args: { member },
} satisfies Meta<typeof ReadingProgressSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
