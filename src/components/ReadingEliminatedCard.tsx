import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { word } from '../data/plural';
import { Button } from './Button';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';

/** Участие завершено красными флагами (годовой Reading challenge). Результат заморожен и не в рейтинге.
 * «Начать заново» обнуляет прогресс этого челленджа; после этого человек снова соглашается с правилами. */
export function ReadingEliminatedCard({ flags, personalDay, busy = false, onRestart }: {
  /** Сколько флагов одновременно завершает участие (с сервера). */
  flags: number;
  /** Личный день участия, в который набрались флаги. */
  personalDay?: number;
  busy?: boolean;
  /** Без него (сервер не умеет сброс) — только пояснение. */
  onRestart?: () => void;
}) {
  const { T, ty } = useTheme();
  const confirm = () => Alert.alert('Начать заново?',
    'Страницы, время, красные флаги, место в рейтинге и история этого челленджа обнулятся. Затем подтвердите правила — и ваш день 1 начнётся сегодня. Это действие нельзя отменить.',
    [{ text: 'Отмена', style: 'cancel' }, { text: 'Начать заново', style: 'destructive', onPress: onRestart }]);
  return <ContentBlock size="compact"><Wrapper gap={12}>
    <View style={styles.heading}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SF name="flag.fill" size={18} color={T.redText} /></View>
      <Text accessibilityRole="header" style={[ty.headline, styles.flex, { color: T.label }]}>Вы выбыли из челленджа</Text>
    </View>
    <Text style={[ty.subhead, nums, { color: T.labelSecondary }]}>
      {`${flags} ${word(flags, 'красный флаг', 'красных флага', 'красных флагов')} одновременно${personalDay ? ` — на ${personalDay}-й день участия` : ''}. Результат больше не в рейтинге, новые подходы недоступны.`}
    </Text>
    {onRestart ? <>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>Можно начать заново: прогресс обнулится, а день 1 начнётся сегодня.</Text>
      <Button label="Начать заново" icon="arrow.counterclockwise" loading={busy} onPress={confirm}
        accessibilityHint="Сбросить результаты этого челленджа и вступить снова" />
    </> : <Text style={[ty.subhead, { color: T.labelSecondary }]}>Чтобы начать заново, обновите приложение.</Text>}
  </Wrapper></ContentBlock>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
});
