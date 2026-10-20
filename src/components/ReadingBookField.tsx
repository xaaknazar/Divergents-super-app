import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { ReadingField } from './ReadingField';
import { Button } from './Button';

export type ReadingBookFieldStatus = 'empty' | 'checking' | 'suggested' | 'verified' | 'notFound' | 'error';
export type ReadingBookOption = { title: string; author: string };

/** «Что читаете»: участник пишет название (автора — по желанию), ИИ предлагает «Эта книга?».
 * empty — поля и «Найти книгу»; checking — ищем; suggested — до трёх вариантов «Название — Автор»,
 * у каждого «Да, эта», и «Нет, другая книга»; verified — только название и автор (без страниц);
 * notFound / error — не нашли: поля для правки и «Записать вручную» (название и автор обязательны);
 * verified + manual — книга записана самим участником. `locked` — книга текущего подхода, сменить нельзя. */
export function ReadingBookField({ status, title, author, error, locked = false, manual = false, suggestions = [], onChangeTitle, onChangeAuthor, onCheck, onEdit, onPick, onReject, onManual }: {
  status: ReadingBookFieldStatus; title: string; author: string;
  /** Варианты для status="suggested". */
  suggestions?: ReadingBookOption[];
  onPick?: (index: number) => void; onReject?: () => void;
  /** Книга записана вручную (для status="verified"). */
  manual?: boolean;
  onManual?: () => void;
  /** Текст ошибки сервиса для status="error". */
  error?: string; locked?: boolean;
  onChangeTitle: (value: string) => void; onChangeAuthor: (value: string) => void;
  onCheck: () => void; onEdit: () => void;
}) {
  const { T, ty, textScale } = useTheme();
  // Крупный шрифт: «Сменить» уходит под книгу, название не сжимается.
  const stacked = useWindowDimensions().fontScale * textScale > 1.15;
  const card = [styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }];
  const heading = <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>Что читаете</Text>;
  if (status === 'verified') return <View style={card}>
    <View style={[styles.verified, stacked && styles.stacked]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.spine, { backgroundColor: T.brandTinted, borderLeftColor: T.brandText }]}>
        <SF name="book.fill" size={18} color={T.brandText} />
      </View>
      <View style={styles.copy} accessible accessibilityLabel={`Что читаете: ${title}${author ? `, ${author}` : ''}. ${manual ? 'Указана вручную' : 'Книга подтверждена'}`}>
        <Text style={[ty.footnote, { color: T.labelSecondary }]}>Что читаете</Text>
        <Text style={[ty.headline, { color: T.label }]}>{title}</Text>
        {author ? <Text style={[ty.subhead, { color: T.labelSecondary }]}>{author}</Text> : null}
        <View style={styles.badge}>
          <SF name={manual ? 'square.and.pencil' : 'checkmark.seal.fill'} size={13} color={manual ? T.labelSecondary : T.greenText} />
          <Text style={[ty.footnoteEm, { color: manual ? T.labelSecondary : T.greenText }]}>{manual ? 'Указана вручную' : 'Книга подтверждена'}</Text>
        </View>
      </View>
      {!locked ? <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Сменить книгу: ${title}`}
        style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[ty.subheadEm, { color: T.brandText }]}>Сменить</Text>
      </Pressable> : null}
    </View>
  </View>;
  if (status === 'suggested' && suggestions.length) return <View style={card}>
    <View accessibilityLiveRegion="polite" style={styles.ask}>
      <SF name="sparkles" size={16} color={T.brandText} />
      <Text accessibilityRole="header" style={[ty.headline, styles.copy, { color: T.label }]}>{suggestions.length > 1 ? 'Какая из этих книг?' : 'Эта книга?'}</Text>
    </View>
    {suggestions.map((b, i) => <View key={`${b.title}|${b.author}|${i}`} style={[styles.option, { backgroundColor: T.fillTertiary }]}>
      <View style={[styles.optionRow, stacked && styles.stacked]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.spine, { backgroundColor: T.brandTinted, borderLeftColor: T.brandText }]}>
          <SF name="book.fill" size={18} color={T.brandText} />
        </View>
        <View style={styles.copy}>
          <Text style={[ty.headline, { color: T.label }]}>{b.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary }]}>{b.author || 'Автор не указан'}</Text>
        </View>
      </View>
      <Button label={suggestions.length > 1 ? 'Да, эта' : 'Да, эта книга'} icon="checkmark" size="compact"
        variant={i === 0 ? 'solid' : 'tinted'} onPress={() => onPick?.(i)}
        accessibilityHint={`Подтвердить: ${b.title}${b.author ? `, ${b.author}` : ''}`} />
    </View>)}
    <Button label="Нет, другая книга" variant="plain" onPress={() => onReject?.()} accessibilityHint="Исправить название или автора" />
  </View>;
  const checking = status === 'checking';
  const canManual = (status === 'notFound' || status === 'error') && !!onManual;
  const manualReady = title.trim().length >= 2 && author.trim().length >= 2;
  return <View style={card}>
    {heading}
    <ReadingField label="Название книги" value={title} onChange={onChangeTitle} disabled={checking || locked} />
    <ReadingField label={canManual ? 'Автор' : 'Автор (если знаете)'} value={author} onChange={onChangeAuthor} disabled={checking || locked} />
    {checking ? <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: T.brandTinted }]}>
      <ActivityIndicator color={T.brandText} />
      <Text style={[ty.subhead, styles.copy, { color: T.brandText }]}>ИИ ищет книгу…</Text>
    </View> : status === 'notFound' ? <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: 'rgba(255,149,0,0.14)' }]}>
      <SF name="exclamationmark.bubble" size={18} color={T.orangeText} />
      <Text style={[ty.subhead, styles.copy, { color: T.label }]}>Не нашли подходящую книгу. Исправьте название и найдите снова — или запишите книгу вручную.</Text>
    </View> : status === 'error' ? <View accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: T.fillTertiary }]}>
      <SF name="exclamationmark.bubble" size={18} color={T.labelSecondary} />
      <Text style={[ty.subhead, styles.copy, { color: T.label }]}>{error ?? 'Проверка недоступна. Повторите позже.'}</Text>
    </View> : null}
    <Button label={status === 'notFound' || status === 'error' ? 'Найти снова' : 'Найти книгу'} icon="sparkles" variant="tinted"
      onPress={onCheck} loading={checking} disabled={locked || checking || title.trim().length < 2} />
    {canManual ? <>
      <Button label="Записать вручную" icon="square.and.pencil" variant="outline" onPress={onManual} disabled={locked || !manualReady}
        accessibilityHint="Книга запишется так, как вы написали название и автора" />
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{manualReady ? 'Книга запишется так, как вы её написали.' : 'Для записи вручную укажите название и автора.'}</Text>
    </> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 12 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  spine: { width: 34, height: 48, borderRadius: 4, borderLeftWidth: 3, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: { borderRadius: radius.xl, borderCurve: 'continuous', padding: 12, gap: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.xl, borderCurve: 'continuous' },
  action: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingLeft: 4 },
});
