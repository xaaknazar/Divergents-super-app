import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums, radius } from '../theme/tokens';
import { word } from '../data/plural';
import { SF } from './SFIcon';

/** Работа без интернета: таймер и страницы сохраняются на телефоне и уходят на сервер при связи.
 * offline — нет ответа сервера; sending — связь есть, сохранённые подходы ещё отправляются. */
export function ReadingOfflineStatus({ state, pending = 0 }: { state: 'offline' | 'sending'; pending?: number }) {
  const { T, ty } = useTheme();
  const waiting = pending > 0 ? `Ждут отправки: ${pending} ${word(pending, 'подход', 'подхода', 'подходов')}.` : '';
  const title = state === 'offline' ? 'Нет интернета' : 'Отправляем сохранённые подходы';
  const text = state === 'offline'
    ? `Таймер и страницы работают и сохраняются на телефоне. Отправим их, когда появится связь. ${waiting}`.trim()
    : `${waiting} Время и страницы уже сохранены на телефоне.`.trim();
  return <View accessible accessibilityRole="summary" accessibilityLabel={`${title}. ${text}`} accessibilityLiveRegion="polite"
    style={[styles.box, { backgroundColor: state === 'offline' ? T.fillTertiary : T.brandTinted }]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SF name={state === 'offline' ? 'wifi.slash' : 'arrow.clockwise'} size={18} color={state === 'offline' ? T.labelSecondary : T.brandText} />
    </View>
    <View style={styles.copy}>
      <Text style={[ty.subheadEm, { color: T.label }]}>{title}</Text>
      <Text style={[ty.footnote, nums, { color: T.labelSecondary }]}>{text}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.xl, borderCurve: 'continuous' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
