import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ReadingFinishedBooks } from './ReadingFinishedBooks';
const meta = { title: 'Reading/Finished books', component: ReadingFinishedBooks,
  args: { books: [{ key: 'ol:1', title: 'Атомные привычки', author: 'Джеймс Клир', coverId: null }, { key: 'm:2', title: 'Пять уровней лидерства', author: 'Джон Максвелл', coverId: null }],
    onReturn: fn() } } satisfies Meta<typeof ReadingFinishedBooks>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Свёрнуто: только строка «Прочитанные · 2». Нажатие раскрывает список. */
export const Collapsed: Story = {};
export const Returning: Story = { args: { busyKey: 'ol:1' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
