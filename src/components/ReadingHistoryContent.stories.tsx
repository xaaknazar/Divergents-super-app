import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingHistoryContent } from './ReadingHistoryContent';
import { continuousReadingFixture } from '../storybook/readingFixtures';
import { historyBookFixture } from './ReadingBookHistoryCard.stories';
const meta = { title: 'Reading/Reader history', component: ReadingHistoryContent,
  args: { data: { challengeId: continuousReadingFixture.id, reader: continuousReadingFixture.me!, own: true, books: [historyBookFixture] }, busy: false, onStatus: () => {} },
} satisfies Meta<typeof ReadingHistoryContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
