import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { ShelfEntry } from '../data/books';
import { useTheme } from '../theme/ThemeContext';
import { BookCard } from './BookCard';
import { SectionHeader } from './SectionHeader';
import { Wrapper } from './Wrapper';

export function BookShelf({ title, entries, onBookPress }: { title: string; entries: ShelfEntry[]; onBookPress: (id: string) => void }) {
  const { textScale = 1 } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, fontScale * textScale > 1.3 ? 240 : 160);
  return <Wrapper marginBottom={8}>
    <SectionHeader title={title} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
      {entries.map(entry => <Wrapper key={entry.book.id} width={cardWidth}>
        <BookCard book={entry.book} variant="shelf" progress={entry.status === 'reading' ? entry.progress : undefined} onPress={() => onBookPress(entry.book.id)} />
      </Wrapper>)}
    </ScrollView>
  </Wrapper>;
}
