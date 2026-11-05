import React, { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { Button } from './Button';
import { ReadingPagesStepButton } from './ReadingPagesStepButton';
import { ReadingPagesConfirmation } from './ReadingPagesConfirmation';
import { parseReadingPages, unusualReadingPages } from '../data/readingPageEntry';

/** Страницы за остановленный подход (не за день): − / число / +, следующая страница и «Сохранить подход».
 * Ноль — допустимый результат: форма открывается с 0 и сохраняет его. Пустое поле не сохраняется. */
export function ReadingPagesForm({ value, onChange, onSubmit, busy = false, sessionMinutes, fromPage, nextPage, bookTitle, invalid = false, dayLabel, submitLabel = 'Сохранить подход', purpose = 'report' }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void; busy?: boolean;
  /** Длительность подхода в минутах, если известна. */
  sessionMinutes?: number;
  /** С какой страницы начали подход. */
  fromPage?: number | null;
  /** Следующая страница — когда известна начальная и введено число. */
  nextPage?: number;
  bookTitle?: string;
  invalid?: boolean;
  /** День подхода, когда он уже закончился (страницы засчитаются в тот день), например «24 октября». */
  dayLabel?: string;
  submitLabel?: string;
  purpose?: 'report' | 'correction';
}) {
  const { T, ty } = useTheme();
  const input = useRef<TextInput>(null);
  const [confirmation, setConfirmation] = useState<string>();
  const n = parseReadingPages(value);
  const identity = JSON.stringify([value, sessionMinutes, bookTitle, dayLabel, purpose]);
  const confirm = confirmation === identity && n !== null;
  const submit = () => {
    if (busy || n === null || invalid) return;
    Keyboard.dismiss();
    if (unusualReadingPages(n, sessionMinutes)) setConfirmation(identity);
    else onSubmit();
  };
  const step = (delta: number) => onChange(String(Math.max(0, Math.min(10000, (n ?? 0) + delta))));
  const context = [sessionMinutes !== undefined ? `Подход ${sessionMinutes} мин` : null, fromPage != null ? `начали со страницы ${fromPage}` : null].filter(Boolean).join(' · ');
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    <Text accessibilityRole="header" style={[ty.title3, styles.center, { color: T.label }]}>{purpose === 'correction' ? 'Изменить страницы' : dayLabel ? `Страницы за ${dayLabel}` : 'Сколько страниц прочитали?'}</Text>
    {bookTitle ? <Text style={[ty.headline, styles.center, { color: T.label }]}>{bookTitle}</Text> : null}
    {context ? <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>{context}</Text> : null}
    {confirm ? <ReadingPagesConfirmation pages={n} minutes={sessionMinutes} busy={busy}
      onEdit={() => { setConfirmation(undefined); requestAnimationFrame(() => input.current?.focus()); }}
      onConfirm={() => { if (!busy && !invalid) onSubmit(); }} /> : <>
    <Text style={[ty.subhead, styles.center, { color: T.labelSecondary }]}>Количество за этот подход, а не номер страницы книги.</Text>
    <View style={styles.stepper}>
      <ReadingPagesStepButton direction="less" disabled={busy || !n} onPress={() => step(-1)} />
      <View style={styles.inputGroup}>
        <TextInput ref={input} value={value} onChangeText={next => onChange(/^\d+$/.test(next.trim()) ? next.trim().replace(/^0+(?=\d)/, '') : next)} editable={!busy}
          accessibilityLabel="Страниц за этот подход" accessibilityHint="Количество прочитанных страниц, не номер страницы книги"
          keyboardType="number-pad" inputMode="numeric" placeholder="0" selectTextOnFocus
          placeholderTextColor={T.labelTertiary} selectionColor={T.brandText} maxLength={12}
          style={[ty.largeTitle, styles.number, nums, { color: T.label }]} />
        <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>страниц</Text>
      </View>
      <ReadingPagesStepButton direction="more" disabled={busy || (n ?? 0) >= 10000} onPress={() => step(1)} />
    </View>
    {value !== '' && n === null ? <Text accessibilityRole="alert" style={[ty.subhead, { color: T.redText }]}>Введите целое число от 0 до 10 000.</Text> : null}
    {nextPage !== undefined && n !== null ? <Text style={[ty.subheadEm, styles.center, { color: T.brandText }]}>В следующий раз начнём со страницы {nextPage}</Text> : null}
    <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>{purpose === 'correction'
      ? 'Время чтения останется прежним. Статистика и рейтинг обновятся после сохранения.' : 'Не успели прочитать — можно сохранить 0.'}</Text>
    <Button label={submitLabel} size="large" loading={busy} disabled={n === null || invalid} onPress={submit}
      accessibilityHint={purpose === 'correction' ? 'Изменить только страницы этого подхода, сохранив время чтения' : dayLabel ? `Страницы засчитаются в ${dayLabel}. После сохранения можно начать чтение за сегодня`
        : 'Сохранить время и страницы для указанной книги. После сохранения можно начать новый подход'} />
    </>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 16, gap: 8 },
  center: { textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 10 },
  inputGroup: { flex: 1, minWidth: 0, gap: 2 },
  number: { textAlign: 'center', minHeight: 48, padding: 0 },
});
