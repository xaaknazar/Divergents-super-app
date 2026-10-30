import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ACHIEVEMENT_CATEGORIES, EarnedBadge } from '../data/achievementCatalog';
import { useTheme } from '../theme/ThemeContext';
import { AchievementMedal } from './AchievementMedal';
import { ContentBlock } from './ContentBlock';
import { SF } from './SFIcon';
import { Wrapper } from './Wrapper';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { fmtDate } from '../data/format';
const TIERS = { 1: 'Бронза', 2: 'Серебро', 3: 'Золото' } as const;

export function AchievementBadgeTile({ b, expanded = false, onPress, onNavigate }: {
  b: EarnedBadge; expanded?: boolean; onPress: () => void; onNavigate: () => void;
}) {
  const { T, ty } = useTheme();
  const progress = Math.min(b.value, b.goal);
  return <Wrapper flex={1}><ContentBlock size="flush">
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={`${b.title}. ${b.earned ? 'Получено' : `Прогресс: ${progress} из ${b.goal}`}. ${b.desc}`}
      accessibilityHint={expanded ? 'Свернуть условия' : 'Показать полные условия и перейти в раздел'}
      style={({ pressed }) => ({ flex: 1, padding: 16, gap: 12, opacity: pressed ? 0.65 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AchievementMedal b={b} size="regular" />
        <SF name={b.earned ? 'checkmark.circle.fill' : 'chevron.down'} color={b.earned ? T.greenText : T.labelSecondary} size={20} />
      </View>
      <Text style={[ty.subhead, { fontFamily: ty.headline.fontFamily, color: T.label }]}>{b.title}</Text>
      <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={expanded ? undefined : 3}>{b.desc}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>{TIERS[b.tier]} · {ACHIEVEMENT_CATEGORIES[b.category].title}</Text>
      {!b.earned ? <ProgressBar value={b.progress} accessibilityLabel={`Прогресс: ${b.title}`} /> : null}
      <Text style={[ty.subhead, { color: b.earned ? T.greenText : T.labelSecondary }]}>{b.earned ? 'В коллекции' : `${progress} из ${b.goal}`}</Text>
    </Pressable>
    {expanded ? <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      {b.earned ? <Text style={[ty.subhead, { color: T.label }]}>Достижение получено</Text> : null}
      {b.earnedAt ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>В коллекции с {fmtDate(b.earnedAt)}</Text> : null}
      <Button size="compact" variant="solid" label="Перейти в раздел" onPress={onNavigate} />
      <Button size="compact" variant="outline" label="Скрыть условия" onPress={onPress} />
    </View> : null}
  </ContentBlock></Wrapper>;
}
