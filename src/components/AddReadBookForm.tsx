import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ReadingField } from './ReadingField';
import { InlineNotice } from './InlineNotice';

/** The fields describe a personal book, never a Reading result. */
export function AddReadBookForm({ title, author, onTitleChange, onAuthorChange, busy = false, error }: {
  title: string; author: string; onTitleChange: (text: string) => void; onAuthorChange: (text: string) => void;
  busy?: boolean; error?: string;
}) {
  const { T, ty } = useTheme();
  return <View style={styles.content}>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>Книга появится в разделе «Прочитано» вашей библиотеки.</Text>
    <ReadingField label="Название книги" value={title} onChange={onTitleChange} disabled={busy} />
    <ReadingField label="Автор" value={author} onChange={onAuthorChange} disabled={busy} />
    <Text style={[ty.footnote, { color: T.labelSecondary }]}>Эта запись не добавляет страницы и время в челленджи.</Text>
    {error ? <InlineNotice message={error} /> : null}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 16 } });
