import React, { useState } from 'react';
import { ReadingHistory } from '../data/readingBooks';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingDiary } from './ReadingDiary';
import { ReadingBookHistoryCard } from './ReadingBookHistoryCard';
import { ScreenDescription } from './ScreenDescription';
import { Segmented } from './Segmented';

/** One destination for the current shelf, finished books and the reading diary.
 * Shelf-only books remain reachable even before their first recorded approach. */
export function ReadingHistoryContent({ data, busy, updatingBookKey, onStatus }: {
  data: ReadingHistory; busy: boolean; updatingBookKey?: string; onStatus: (key: string, finished: boolean) => void;
}) {
  // Preserve legacy history entries and use the owner's shelf for current status.
  const books = [...new Map([...data.books, ...(data.own ? data.shelfBooks ?? [] : [])].map(book => [book.key, book])).values()];
  const current = books.filter(book => !book.finished);
  const finished = books.filter(book => book.finished);
  const [section, setSection] = useState(() => !current.length && finished.length ? 1 : 0);
  const visible = section === 1 ? finished : current;
  return <Wrapper padding={16} gap={18}>
    <PageHeading title={data.own ? 'Мои книги и история' : data.reader.name}
      description={data.own ? 'Ваши книги и сохранённые результаты чтения' : 'Книги и история участника'} />
    <Segmented items={['Читаю', 'Прочитано', 'По дням']} value={section} onChange={setSection} />
    {section === 2 ? <>
      <ReadingProgressSummary member={data.reader} />
      <ReadingDiary member={data.reader} />
    </> : <>
      <PageHeading title={`${section === 1 ? 'Прочитанные книги' : 'Сейчас в чтении'} · ${visible.length}`}
        description={section === 1
          ? data.own ? 'Все страницы и время сохранены. Верните книгу в чтение, если захотите продолжить.' : 'Книги, которые участник отметил прочитанными.'
          : data.own ? 'Эти книги доступны для выбора под таймером.' : 'Книги, которые участник читает сейчас.'} />
      {visible.map(book => <ReadingBookHistoryCard key={book.key} book={book} busy={busy} updating={updatingBookKey === book.key}
        onStatus={data.own ? finished => onStatus(book.key, finished) : undefined} />)}
      {!visible.length ? <ScreenDescription text={section === 1
        ? data.own ? 'Здесь появятся книги, которые вы отметите прочитанными.' : 'Пока нет прочитанных книг.'
        : data.own ? 'Добавьте книгу под таймером или верните одну из раздела «Прочитано».' : 'Сейчас нет книг в чтении.'} /> : null}
    </>}
  </Wrapper>;
}
