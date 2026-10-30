import React from 'react';
import { Text, View } from 'react-native';
import { BookDetail } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { BookCover } from './BookCover';
import { StatusBadge } from './StatusBadge';

export function BookOverview({ book }: { book: BookDetail }) {
  const { T, ty } = useTheme();
  return <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
    <BookCover imageUrl={book.imageUrl} size="detail" />
    <View style={{ gap: 6, width: '100%' }}>
      <Text accessibilityRole="header" style={[ty.title2, { color: T.label, textAlign: 'center' }]}>{book.title}</Text>
      <Text style={[ty.body, { color: T.labelSecondary, textAlign: 'center' }]}>{book.author}</Text>
    </View>
    <View style={{ gap: 6, alignItems: 'center' }}>
      {book.rating ? <Text style={[ty.footnoteEm, { color: T.label }]} accessibilityLabel={`Оценка Divergents ${book.rating.toFixed(1)}`}>Divergents · {book.rating.toFixed(1)} из 5</Text> : null}
      <Text style={[ty.footnote, { color: T.labelSecondary, textAlign: 'center' }]}>
        {book.ratingAvg != null ? `Читатели · ${book.ratingAvg.toFixed(1)} из 5 · оценок: ${book.ratingCount}` : 'Читатели ещё не оценивали'}
      </Text>
    </View>
    {book.genres.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {book.genres.map(genre => <StatusBadge key={genre} label={genre} tone="neutral" />)}
    </View> : null}
  </View>;
}
