import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ChallengeReadingSheet, ChallengeReadingSheetProps, ChallengeBook } from './ChallengeReadingSheet';
import { Wrapper } from './Wrapper';
import { NavHeader } from './NavHeader';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { Button } from './Button';

const examples: ChallengeBook[] = [
  { id: 'habits', title: 'Атомные привычки', author: 'Джеймс Клир', pages: 84, todayPages: 20, finished: false },
  { id: 'sleep', title: 'Зачем мы спим', author: 'Мэттью Уолкер', pages: 32, todayPages: 0, finished: false },
  { id: 'prince', title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери', pages: 96, todayPages: 0, finished: true },
];
function Preview(args: ChallengeReadingSheetProps) {
  const [books, setBooks] = useState(args.books);
  const [visible, setVisible] = useState(true);
  return <Wrapper flex={1}>
    <NavHeader title="Divergents Challenge" largeTitle onBack={() => {}} />
    <Wrapper padding={20} gap={16}>
      <ScreenDescription text="День 8 из 21" />
      <ContentBlock><ScreenDescription text="Задания на сегодня" /><Button label="Чтение · 20 страниц" variant="plain" onPress={() => setVisible(true)} /></ContentBlock>
    </Wrapper>
    {visible ? <ChallengeReadingSheet {...args} books={books} onClose={() => setVisible(false)} onAdd={async book => {
      const added = { ...book, id: `preview-${books.length}`, pages: 0, todayPages: 0, finished: false };
      setBooks(prev => [...prev, added]); return added;
    }} onSave={async report => {
      if (!(await args.onSave(report))) return false;
      setBooks(prev => prev.map(b => b.id === report.bookId ? { ...b, pages: b.pages - b.todayPages + report.pages, todayPages: report.pages, finished: report.finished } : b));
      return true;
    }} /> : null}
  </Wrapper>;
}
const meta = { title: 'Challenge/ReadingBooks', component: ChallengeReadingSheet, render: args => <Preview {...args} />,
  parameters: { canvasLayout: 'screen' },
  args: { books: examples, unassignedPages: 0, onRetry: () => {}, onClose: () => {}, onAdd: async () => null, onSave: async (): Promise<boolean> => true },
} satisfies Meta<typeof ChallengeReadingSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Entry: Story = {};
export const Empty: Story = { args: { books: [] } };
export const Books: Story = { args: { initialView: 'books' } };
export const Add: Story = { args: { initialView: 'add' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Loading: Story = { args: { books: [], loading: true } };
export const Error: Story = { args: { error: 'Не удалось сохранить. Проверьте интернет и повторите — введённые страницы остаются здесь.' } };
export const OldEntries: Story = { args: { unassignedPages: 12 } };
export const Finished: Story = { args: { books: [examples[2]], initialBookId: 'prince' } };
export const LongTitle: Story = { args: { books: [{ ...examples[0], title: 'Думай медленно… решай быстро. Психология принятия решений', author: 'Даниэль Канеман' }] } };

export const Saving: Story = { args: { onSave: async () => new Promise<boolean>(() => {}) } };
export const SaveFailure: Story = { args: { onSave: async () => false, error: 'Нет связи. Запись не подтверждена — повторите сохранение.' } };
