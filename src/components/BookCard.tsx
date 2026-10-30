import React from 'react';
import { Text, View } from 'react-native';
import { BookListItem } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { ContentBlock } from './ContentBlock';
import { BookCover } from './BookCover';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { SF } from './SFIcon';
import { StatusBadge } from './StatusBadge';

const shelfLabel = { want: 'В планах', reading: 'Читаю', read: 'Прочитано' } as const;
export function BookCard({ book, variant = 'catalog', progress, onPress }: {
  book: Omit<BookListItem, 'genres' | 'comments'> & { comments?: number };
  variant?: 'catalog' | 'shelf'; progress?: number; onPress: () => void;
}) {
  const { T, ty } = useTheme();
  return <PressableScale onPress={onPress} accessibilityLabel={`${book.title}${book.author ? `. ${book.author}` : ''}${book.shelf ? `. ${shelfLabel[book.shelf.status]}` : ''}`}>
      <View style={{ gap: 10 }}>
        <BookCover imageUrl={book.imageUrl} />
        <Text style={[ty.subheadEm, { color: T.label }]}>{book.title}</Text>
        {variant === 'catalog' ? <Text style={[ty.footnote, { color: T.labelSecondary }]}>{book.author}</Text> : null}
        {book.shelf ? <View style={{ alignSelf: 'flex-start' }}><StatusBadge label={shelfLabel[book.shelf.status]} tone={book.shelf.status === 'read' ? 'success' : 'brand'} size="compact" /></View> : null}
        {progress !== undefined ? <View style={{ gap: 6 }}>
          <ProgressBar value={progress / 100} accessibilityLabel={`Прочитано: ${book.title}`} />
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>{progress}%</Text>
        </View> : null}
        {variant === 'catalog' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {book.rating ? <View accessibilityLabel={`Оценка Divergents ${book.rating.toFixed(1)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><SF name="star.fill" size={12} color={T.orangeText} /><Text style={[ty.caption1, { color: T.labelSecondary }]}>{book.rating.toFixed(1)}</Text></View> : null}
          {book.userRating ? <View accessibilityLabel={`Оценка читателей ${book.userRating.toFixed(1)}, оценок: ${book.userRatingCount ?? 0}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><SF name="person.2.fill" size={12} color={T.labelSecondary} /><Text style={[ty.caption1, { color: T.labelSecondary }]}>{book.userRating.toFixed(1)} · {book.userRatingCount ?? 0}</Text></View> : null}
          {book.comments ? <View accessibilityLabel={`Комментариев: ${book.comments}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><SF name="bubble.left.fill" size={12} color={T.labelSecondary} /><Text style={[ty.caption1, { color: T.labelSecondary }]}>{book.comments}</Text></View> : null}
        </View> : null}
      </View>
  </PressableScale>;
}
