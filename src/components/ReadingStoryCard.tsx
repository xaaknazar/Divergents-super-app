import React, { forwardRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ReadingHistory } from '../data/readingBooks';
import { readingStatistics } from '../data/readingStatistics';
import { lightTheme, darkTheme, FONT } from '../theme/tokens';
import { Logo } from './Logo';
export type ReadingStoryBackground = 'navy' | 'paper' | 'night' | 'photo';
/** A fixed 9:16 share artifact. All dimensions scale together; never export controls. */
export const ReadingStoryCard = forwardRef<View, { data: ReadingHistory; background: ReadingStoryBackground; photo?: string;
  metrics: string[]; bookPage: number | null; onImageReady?: () => void; onImageError?: () => void }>(function ReadingStoryCard({ data, background, photo, metrics, bookPage, onImageReady, onImageError }, ref) {
  const [width, setWidth] = useState(320);
  const s = readingStatistics(data), u = width / 100;
  const light = background === 'paper';
  const palette = light ? lightTheme : darkTheme;
  const ink = light ? palette.label : '#FFFFFF';
  const bg = light ? palette.groupedBg : background === 'navy' ? lightTheme.brand : palette.groupedBg;
  const pageBooks = bookPage === null ? [] : s.books.slice(bookPage * 5, bookPage * 5 + 5);
  return <View ref={ref} collapsable={false} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[styles.canvas, { backgroundColor: bg }]}>
    {background === 'photo' && photo ? <><Image source={{ uri: photo }} onLoad={onImageReady} onError={onImageError} resizeMode="cover" style={StyleSheet.absoluteFillObject} /><View style={[StyleSheet.absoluteFillObject, styles.scrim]} /></> : null}
    <View style={[styles.content, { padding: u * 8 }]}>
      <View style={styles.brand}><Logo size={u * 8} body={ink} head={ink} /><Text allowFontScaling={false} style={[styles.wordmark, { fontSize: u * 4, color: ink }]}>DIVERGENTS</Text></View>
      <View style={{ gap: u * 3 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={[styles.title, { fontSize: u * 8, color: ink }]}>{s.period?.completed ? 'Мой год\nчтения' : 'Каждая страница\nимеет значение'}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={{ fontFamily: FONT.regular, fontSize: u * 3.8, color: ink }}>{data.title ?? 'Reading challenge'} · {data.reader.name}</Text>
        <Text allowFontScaling={false} style={{ fontFamily: FONT.regular, fontSize: u * 3.6, color: ink }}>{s.period ? `${s.period.personalDay} из ${s.period.totalDays} дней` : `${data.reader.daysParticipated ?? 1} дней участия`}</Text>
      </View>
      {bookPage === null ? <View style={[styles.grid, { gap: u * 5 }]}>{s.metrics.filter(m => metrics.includes(m.key)).map(m => <View key={m.key} style={styles.cell}>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { fontSize: u * 8, color: ink }]}>{m.value}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={{ fontFamily: FONT.regular, fontSize: u * 3.3, color: ink }}>{m.label}</Text>
      </View>)}</View> : <View style={{ gap: u * 5 }}>
        <Text allowFontScaling={false} style={[styles.value, { color: ink, fontSize: u * 5 }]}>Моя книжная полка</Text>
        {pageBooks.map(b => <View key={b.key} style={{ gap: u }}>
          <Text allowFontScaling={false} numberOfLines={2} style={[styles.value, { color: ink, fontSize: u * 4 }]}>{b.title}</Text>
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontFamily: FONT.regular, color: ink, fontSize: u * 3 }}>{b.author}</Text>
          <Text allowFontScaling={false} style={{ fontFamily: FONT.regular, color: ink, fontSize: u * 3 }}>{b.pages} стр. · {b.finished ? 'Прочитана' : 'В процессе'}</Text>
        </View>)}
      </View>}
      <Text allowFontScaling={false} style={{ fontFamily: FONT.regular, color: ink, fontSize: u * 3.2 }}>{s.period?.completed ? 'Год закончился. Привычка остаётся.' : 'Читаю. Расту. Продолжаю.'}</Text>
    </View>
  </View>;
});
const styles = StyleSheet.create({ canvas: { width: '100%', aspectRatio: 9 / 16, borderRadius: 24, overflow: 'hidden' }, content: { flex: 1, justifyContent: 'space-between' }, brand: { flexDirection: 'row', gap: 10, alignItems: 'center' }, wordmark: { fontFamily: FONT.bold, letterSpacing: 2 }, title: { fontFamily: FONT.extrabold, letterSpacing: -0.8 }, value: { fontFamily: FONT.bold }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '45%', gap: 4 }, scrim: { backgroundColor: 'rgba(0,0,0,0.66)' } });
