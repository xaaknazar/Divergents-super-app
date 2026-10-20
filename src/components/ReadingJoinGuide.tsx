import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { radius } from '../theme/tokens';

export function ReadingJoinGuide({ state, teamName, startLabel }: {
  state: 'choose' | 'pending' | 'approved'; teamName?: string; startLabel?: string;
}) {
  const { T, ty } = useTheme();
  const title = state === 'choose' ? 'Найдите свою команду' : state === 'pending' ? 'Заявка у капитана' : 'Вы в команде';
  const detail = state === 'choose' ? 'Откройте состав, выберите команду и отправьте заявку. После одобрения капитаном вы сможете читать вместе.'
    : state === 'pending' ? `Капитан${teamName ? ` команды «${teamName}»` : ''} рассмотрит вашу заявку. Повторно отправлять её не нужно.`
      : `${teamName ? `Команда «${teamName}». ` : ''}${startLabel ? `Чтение и личный прогресс откроются ${startLabel}.` : 'Чтение и личный прогресс откроются после старта.'}`;
  return <View style={[styles.card, { backgroundColor: T.brandTinted }]}>
    <View style={styles.title}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name={state === 'pending' ? 'clock' : state === 'approved' ? 'checkmark.circle.fill' : 'person.3.fill'} size={24} color={T.brandText} /></View>
      <Text accessibilityRole="header" style={[ty.headline, styles.flex, { color: T.label }]}>{title}</Text>
    </View>
    <Text style={[ty.subhead, { color: T.labelSecondary }]}>{detail}</Text>
  </View>;
}
const styles = StyleSheet.create({ card: { borderRadius: radius.block, padding: 18, gap: 12 }, title: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1 } });
