import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingTodayBooks } from './ReadingTodayBooks';
import { readingBookExample } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Today books', component: ReadingTodayBooks, args: { books: [readingBookExample,
  { ...readingBookExample, key: 'b', title: 'Пять уровней лидерства', author: 'Джон Максвелл', pages: 20, elapsedMs: 35 * 60000 }] } } satisfies Meta<typeof ReadingTodayBooks>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TwoBooks: Story = {};
export const Empty: Story = { args: { books: [] } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
