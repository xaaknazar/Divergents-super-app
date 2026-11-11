import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { BookCoverViewer } from './BookCoverViewer';
import { Button } from './Button';
const meta = { title: 'Книги/BookCoverViewer', component: BookCoverViewer,
  parameters: { reduceMotion: false },
  args: { source: 'https://covers.openlibrary.org/b/id/12539702-L.jpg', title: 'Демонстрационная обложка',
    origin: { x: 140, y: 170, width: 120, height: 176 }, onClose: () => {} },
  render: function Preview(args) { const [open, setOpen] = useState(true);
    return open ? <BookCoverViewer {...args} onClose={() => setOpen(false)} />
      : <Button label="Открыть обложку" onPress={() => setOpen(true)} />; },
} satisfies Meta<typeof BookCoverViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const LongTitle: Story = { args: { title: 'Очень длинное название книги, которое должно оставлять кнопку закрытия доступной' }, parameters: { textSize: 'xl', viewport: 'compact' } };
