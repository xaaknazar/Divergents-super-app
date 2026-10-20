import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookPicker } from './ReadingBookPicker';
import { ReadingBookSelection } from '../data/readingBooks';
const book = { key: 'ol:OL27448W', title: 'Властелин колец', author: 'Дж. Р. Р. Толкин', coverId: 258027 };
const meta = { title: 'Reading/Book picker', component: ReadingBookPicker,
  args: { value: { title: '', author: '' }, onChange: () => {}, disabled: false,
    search: { busy: false, books: [book], correctedQuery: null, search: () => {} } },
  render: args => { const [value, setValue] = useState<ReadingBookSelection>(args.value); return <ReadingBookPicker {...args} value={value} onChange={setValue} />; },
} satisfies Meta<typeof ReadingBookPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Offline: Story = { args: { search: { busy: false, books: [], correctedQuery: null, error: 'Поиск недоступен. Книгу можно указать вручную.', search: () => {} } } };
