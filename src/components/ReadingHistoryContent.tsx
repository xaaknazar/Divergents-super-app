import React from 'react';
import { ReadingHistory } from '../data/readingBooks';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingBookHistoryCard } from './ReadingBookHistoryCard';
import { ScreenDescription } from './ScreenDescription';
export function ReadingHistoryContent({ data, busy, onStatus }: { data: ReadingHistory; busy: boolean; onStatus: (key: string, finished: boolean) => void }) {
  return <Wrapper padding={16} gap={18}>
    <PageHeading title={data.reader.name} description={data.own ? 'Ваша история чтения' : 'История участника'} />
    <ReadingProgressSummary member={data.reader} />
    <PageHeading title="Книги" description="Здесь только подходы, подтверждённые сервером. Статус «Прочитана» отмечает сам читатель." />
    {data.books.map(book => <ReadingBookHistoryCard key={book.key} book={book} busy={busy} onStatus={data.own ? finished => onStatus(book.key, finished) : undefined} />)}
    {!data.books.length ? <ScreenDescription text="После первого сохранённого подхода здесь появится книга." /> : null}
  </Wrapper>;
}
