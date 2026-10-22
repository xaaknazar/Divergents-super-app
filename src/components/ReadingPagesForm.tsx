import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONT, nums, radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { Button } from './Button';

/** Страницы за остановленный подход (не за день): − / число / +, следующая страница,
 * «Ноль — тоже можно…» и «Сохранить подход». Пустое поле не сохраняется: число нужно указать явно. */
export function ReadingPagesForm({ value, onChange, onSubmit, busy = false, sessionMinutes, fromPage, nextPage, bookTitle, invalid = false }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void; busy?: boolean;
  /** Длительность подхода в минутах, если известна. */
  sessionMinutes?: number;
  /** С какой страницы начали подход. */
  fromPage?: number | null;
  /** Следующая страница — когда известна начальная и введено число. */
  nextPage?: number;
  bookTitle?: string;
  invalid?: boolean;
}) {
  const { T, ty } = useTheme();
  const n = /^\d+$/.test(value) ? Number(value) : null;
  const step = (delta: number) => onChange(String(Math.max(0, Math.min(10000, (n ?? 0) + delta))));
  const context = [sessionMinutes !== undefined ? `Подход ${sessionMinutes} мин` : null, fromPage != null ? `начали со страницы ${fromPage}` : null].filter(Boolean).join(' · ');
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    <Text accessibilityRole="header" style={[ty.title3, styles.center, { color: T.label }]}>Страницы за этот подход</Text>
    {bookTitle ? <Text style={[ty.headline, styles.center, { color: T.label }]}>{bookTitle}</Text> : null}
    {context ? <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>{context}</Text> : null}
    <View style={styles.stepper}>
      <StepButton icon="minus" label="Меньше страниц" disabled={busy || !n} onPress={() => step(-1)} />
      <TextInput value={value} onChangeText={next => onChange(next.replace(/\D/g, '').slice(0, 5))} editable={!busy}
        accessibilityLabel="Страниц за этот подход" keyboardType="number-pad" inputMode="numeric" placeholder="0"
        placeholderTextColor={T.labelQuaternary} selectionColor={T.brandText} maxLength={5}
        style={[styles.number, nums, { color: T.label }]} />
      <StepButton icon="plus" label="Больше страниц" disabled={busy || (n ?? 0) >= 10000} onPress={() => step(1)} />
    </View>
    {nextPage !== undefined && n !== null ? <Text style={[ty.subheadEm, styles.center, { color: T.brandText }]}>В следующий раз начнём со страницы {nextPage}</Text> : null}
    <Text style={[ty.footnote, styles.center, { color: T.labelSecondary }]}>Ноль — тоже можно, если сразу отвлекли.</Text>
    <Button label="Сохранить подход" size="large" loading={busy} disabled={n === null || invalid} onPress={onSubmit} />
  </View>;
}

function StepButton({ icon, label, disabled, onPress }: { icon: string; label: string; disabled: boolean; onPress: () => void }) {
  const { T } = useTheme();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    style={({ pressed }) => [styles.step, { backgroundColor: T.brandTinted, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
    <SF name={icon} size={22} color={T.brandText} />
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, padding: 18, gap: 8 },
  center: { textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 10 },
  step: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  number: { minWidth: 96, textAlign: 'center', fontFamily: FONT.bold, fontSize: 52, lineHeight: 60, padding: 0 },
});
