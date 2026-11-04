import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SFName } from './SFIcon';
import { IconTile, IconTileTone } from './IconTile';

/** Главное о челлендже до вступления — четыре пункта с иконками. Полные правила остаются ниже, свёрнутыми. */
export function ReadingRulesHighlights({ targetMinutes = 60, eliminationFlags, flagRecoveryDays }: {
  targetMinutes?: number; eliminationFlags?: number; flagRecoveryDays?: number;
}) {
  const { T, ty } = useTheme();
  const items: { icon: SFName; tone: IconTileTone; title: string; text: string }[] = [
    { icon: 'clock.fill', tone: 'brand', title: `${targetMinutes} минут в день`,
      text: 'Можно несколькими подходами. День закрывается в 00:00 по Алматы.' },
    { icon: 'lock.fill', tone: 'violet', title: 'Телефон без отвлечений',
      text: 'Во время таймера выбранные приложения недоступны. Пауза сразу снимает ограничения.' },
    { icon: 'book.fill', tone: 'challenge', title: 'Книга и страницы',
      text: 'После подхода выберите книгу, которую читали, и честно укажите страницы.' },
    { icon: 'flag.fill', tone: 'orange', title: 'Красные флаги',
      text: `День без нормы — красный флаг.${flagRecoveryDays ? ` ${flagRecoveryDays} дней подряд с нормой снимают один флаг.` : ''}${eliminationFlags ? ` ${eliminationFlags} флагов одновременно — выбывание, вернуться можно с нуля.` : ''}` },
  ];
  return <View style={[styles.card, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]}>
    {items.map((item, i) => <View key={item.title} accessible accessibilityLabel={`${item.title}. ${item.text}`}
      style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.separator }]}>
      <IconTile icon={item.icon} tone={item.tone} variant="soft" size="sm" />
      <View style={styles.copy}>
        <Text style={[ty.headline, { color: T.label }]}>{item.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{item.text}</Text>
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14, alignItems: 'flex-start' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
