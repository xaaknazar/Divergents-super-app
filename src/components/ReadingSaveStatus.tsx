import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';

/** Статус сохранения подхода без ложного успеха. saved — только после ответа сервера;
 * pending — записано на телефоне; retry — сервер не ответил. */
export function ReadingSaveStatus({ state, detail, onRetry }: {
  state: 'saved' | 'pending' | 'retry';
  /** Вторая строка вместо стандартной (например, «24 мин · 15 страниц · подтверждено в 12:41»). */
  detail?: string;
  onRetry?: () => void;
}) {
  const { T, ty } = useTheme();
  const S = {
    saved: { title: 'Подход сохранён', text: 'Время и страницы подтверждены сервером', icon: 'checkmark.circle.fill', ink: T.greenText, bg: T.emeraldBadgeBg },
    pending: { title: 'Записано на телефоне', text: 'Ещё не в статистике — отправим автоматически', icon: 'clock.fill', ink: T.labelSecondary, bg: T.brandTinted },
    retry: { title: 'Сервер не ответил', text: 'Подход не потерян. Можно повторить безопасно', icon: 'exclamationmark.bubble', ink: T.orangeText, bg: 'rgba(255,149,0,0.14)' },
  }[state];
  return <View accessibilityLiveRegion="polite" style={[styles.box, { backgroundColor: S.bg }]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={S.icon} size={20} color={S.ink} /></View>
    <View style={styles.copy}>
      <Text accessibilityRole={state === 'retry' ? 'alert' : undefined} style={[ty.subheadEm, { color: T.label }]}>{S.title}</Text>
      <Text style={[ty.footnote, { color: T.labelSecondary }]}>{detail ?? S.text}</Text>
    </View>
    {state === 'retry' && onRetry ? <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Повторить"
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[ty.subheadEm, { color: T.brandText }]}>Повторить</Text>
    </Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.xl, borderCurve: 'continuous' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  action: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingLeft: 4 },
});
