import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingHistoryContent } from './ReadingHistoryContent';
import { continuousReadingFixture } from '../storybook/readingFixtures';
import { historyBookFixture } from './ReadingBookHistoryCard.stories';
const finished = { ...historyBookFixture, key: 'finished', title: 'Netflix. Инсайдерская история компании, завоевавшей мир',
  author: 'Джина Китинг', coverId: null, pages: 195, elapsedMs: 344 * 60000, finished: true };
const data = { challengeId: continuousReadingFixture.id, reader: continuousReadingFixture.me!, own: true, books: [historyBookFixture, finished] };
const meta = { title: 'Reading/Reader history', component: ReadingHistoryContent,
  args: { data, busy: false, onStatus: () => {} },
} satisfies Meta<typeof ReadingHistoryContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Archive: Story = { args: { data: { ...data, books: [finished] } } };
export const ArchiveDark: Story = { ...Archive, parameters: { scheme: 'dark' } };
export const ArchiveLargeText: Story = { ...Archive, parameters: { viewport: 'compact', textSize: 'xl' } };
export const Returning: Story = { args: { data: { ...data, books: [finished] }, busy: true, updatingBookKey: finished.key } };
export const Empty: Story = { args: { data: { ...data, books: [] } } };
export const NotStartedBook: Story = { args: { data: { ...data, books: [], supportsBookshelf: true,
  shelfBooks: [{ ...finished, pages: 0, elapsedMs: 0, lastReadAt: null, addedAt: '2026-10-29T10:00:00Z' }] } } };
export const Spectator: Story = { args: { data: { ...data, own: false } } };
