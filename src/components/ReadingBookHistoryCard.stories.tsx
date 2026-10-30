import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookHistoryCard } from './ReadingBookHistoryCard';
export const historyBookFixture = { key: 'ol:OL27448W', title: 'Властелин колец', author: 'Дж. Р. Р. Толкин', coverId: 258027,
  pages: 120, elapsedMs: 18000000, nextPage: 121, lastReadAt: '2026-10-19T13:00:00Z', finished: false, editable: true };
const meta = { title: 'Reading/Book history card', component: ReadingBookHistoryCard,
  excludeStories: ['historyBookFixture'],
  args: { book: historyBookFixture, busy: false, onStatus: () => {} },
} satisfies Meta<typeof ReadingBookHistoryCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Finished: Story = { args: { book: { ...historyBookFixture, finished: true } } };
export const Returning: Story = { args: { book: { ...historyBookFixture, finished: true }, busy: true, updating: true } };
export const NoApproaches: Story = { args: { book: { ...historyBookFixture, lastReadAt: null, addedAt: '2026-10-29T10:00:00Z',
  pages: 0, elapsedMs: 0, nextPage: null } } };
export const Spectator: Story = { args: { book: { ...historyBookFixture, editable: false }, onStatus: undefined } };
