import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { radius } from '../theme/tokens';

/** Следующий шаг: выбрать команду → капитан одобрит → читать 60 минут в день (handoff 2026-10-20 §6). */
export function ReadingJoinGuide({ state, teamName, startLabel }: {
  state: 'choose' | 'pending' | 'approved'; teamName?: string; startLabel?: string;
}) {
  const { T, ty, isDark } = useTheme();
  const step = { choose: 0, pending: 1, approved: 2 }[state];
  const team = teamName ? `Команда «${teamName}»` : 'Команда выбрана';
  const heading = state === 'choose' ? 'Как вступить' : state === 'pending' ? 'Заявка на рассмотрении' : teamName ? `Вы в команде «${teamName}»` : 'Вы в команде';
  const steps: [string, string][] = [
    ['Выберите команду', step === 0 ? 'Ниже — команды со свободными местами' : team],
    ['Капитан одобрит заявку', step === 1 ? 'Ждём ответа капитана. Повторно отправлять её не нужно.' : step > 1 ? 'Вы в команде' : 'Капитан рассмотрит заявку в свою команду'],
    ['Читайте 60 минут в день', step === 2 ? startLabel ? `Таймер откроется в день старта — ${startLabel}` : 'Таймер откроется после старта' : 'Можно в несколько подходов'],
  ];
  return <View accessible={false} style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]}>{heading}</Text>
    <View style={styles.list}>
      {steps.map(([title, text], i) => {
        const done = i < step, current = i === step;
        return <View key={title} style={styles.step} accessibilityLabel={`Шаг ${i + 1}${done ? ', выполнен' : current ? ', сейчас' : ''}. ${title}. ${text}`} accessible>
          <View style={styles.rail}>
            <View style={[styles.badge, done ? { backgroundColor: T.brandText }
              : { borderWidth: current ? 1.5 : 1, borderColor: current ? T.brandText : T.cardBorder }]}>
              {done ? <SF name="checkmark" size={16} color={isDark ? T.systemBg : T.onBrand} />
                : <Text style={[ty.footnoteEm, { color: current ? T.brandText : T.labelTertiary }]}>{i + 1}</Text>}
            </View>
            {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: done ? T.brandText : T.separator }]} /> : null}
          </View>
          <View style={styles.copy}>
            <Text style={[current ? ty.headline : ty.callout, { color: current || done ? T.label : T.labelSecondary }]}>{title}</Text>
            <Text style={[ty.footnote, { color: T.labelSecondary }]}>{text}</Text>
          </View>
        </View>;
      })}
    </View>
    {state === 'choose' ? <View style={[styles.note, { backgroundColor: T.brandTinted }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="checkmark.seal.fill" size={16} color={T.labelSecondary} /></View>
      <Text style={[ty.caption1, styles.flex, { color: T.labelSecondary }]}>Капитан выбранной команды и администраторы смогут посмотреть вашу анкету</Text>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', borderWidth: 1, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 6 },
  list: { marginTop: 14 },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center' },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 1, marginVertical: 4 },
  copy: { flex: 1, minWidth: 0, gap: 2, paddingTop: 3, paddingBottom: 16 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.input },
  flex: { flex: 1 },
});
