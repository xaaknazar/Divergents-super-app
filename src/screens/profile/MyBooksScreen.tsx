// «Мои книги»: библиотека Divergents и книги Reading-челленджей вместе. Отметка «Прочитана»
// здесь та же, что в «Что читаете» челленджа, — книга уходит из полки выбора и там.
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { AddReadBookSheet } from '../../components/AddReadBookSheet';
import { Button } from '../../components/Button';
import { DetailScreen } from '../../components/DetailScreen';
import { EmptyState } from '../../components/EmptyState';
import { InlineNotice } from '../../components/InlineNotice';
import { MyBookRow } from '../../components/MyBookRow';
import { MyBooksSection } from '../../components/MyBooksSection';
import { PageHeading } from '../../components/PageHeading';
import { ContentLoading } from '../../components/ContentLoading';
import { Wrapper } from '../../components/Wrapper';
import type { MyBookItem } from '../../data/myBooks';
import { ProfileStackParams } from '../../navigation/types';
import { useMyBooks } from '../../state/useMyBooks';

type Props = NativeStackScreenProps<ProfileStackParams, 'MyBooks'>;

export function MyBooksScreen({ navigation }: Props) {
  const books = useMyBooks();
  const [adding, setAdding] = useState(false);
  const openBook = (id: string) => navigation.navigate('BookDetail', { bookId: id });
  const openLibrary = () => navigation.navigate('Books');
  const reading = books.items.filter(b => b.status === 'reading');
  const read = books.items.filter(b => b.status === 'read');
  const planned = books.items.filter(b => b.status === 'want');
  const row = (item: MyBookItem) => <MyBookRow key={item.id} title={item.title} author={item.author} cover={item.cover} detail={item.detail}
    read={item.status === 'read'} busy={books.busyId === item.id} onPress={item.libraryBookId ? () => openBook(item.libraryBookId!) : undefined}
    onToggleRead={item.status === 'want' ? undefined : () => books.setRead(item, item.status !== 'read')} />;
  return <DetailScreen backLabel="Профиль" onBack={() => navigation.goBack()} onRefresh={books.reload}>
    <Wrapper paddingHorizontal={20} paddingTop={4} paddingBottom={16}>
      <PageHeading title="Моя библиотека" description="Книги, которые вы читаете, планируете и уже прочитали — в одном месте." />
    </Wrapper>
    {books.error ? <Wrapper paddingHorizontal={16} paddingBottom={12}><InlineNotice message={books.error} /></Wrapper> : null}
    {!books.loaded ? <ContentLoading /> : !books.items.length && !books.error ? <EmptyState icon="book.fill" title="Пока нет книг"
      subtitle="Сохраните уже прочитанную книгу вручную или выберите следующую в каталоге." />
      : <Wrapper gap={22} paddingBottom={16}>
        <MyBooksSection title="Читаю" count={reading.length}>{reading.map(row)}</MyBooksSection>
        <MyBooksSection title="Прочитано" count={read.length}>{read.map(row)}</MyBooksSection>
        <MyBooksSection title="В планах" count={planned.length}>{planned.map(row)}</MyBooksSection>
      </Wrapper>}
    <Wrapper paddingHorizontal={16} paddingBottom={32} gap={12}>
      <Button label="Добавить прочитанную книгу" icon="plus" onPress={() => setAdding(true)} />
      <Button label="Библиотека книг" icon="book.fill" variant="tinted" onPress={openLibrary} />
    </Wrapper>
    {adding ? <AddReadBookSheet onClose={() => setAdding(false)} onSave={books.addReadBook} /> : null}
  </DetailScreen>;
}
