import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookSummaryRow } from './ReadingBookSummaryRow';
import { readingBookExample } from '../storybook/readingFixtures';
const meta = { title: 'Reading/Book summary row', component: ReadingBookSummaryRow, args: { book: readingBookExample } } satisfies Meta<typeof ReadingBookSummaryRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Choose: Story = { args: { onSelect: () => {}, selected: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' }, args: { book: { ...readingBookExample,
  title: 'Очень длинное название книги: как читать несколько книг и сохранять привычку каждый день', author: 'Автор с длинным именем и фамилией' } } };
