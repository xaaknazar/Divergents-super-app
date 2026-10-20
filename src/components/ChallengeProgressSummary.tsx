import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { tr } from '../state/LanguageContext';
import { Button } from './Button';
import { Logo } from './Logo';
import { StatusBadge } from './StatusBadge';

export function ChallengeProgressSummary({ title, day, totalDays, teamName, teamPoints, pointsToday, rank, teamCount, eliminated, onPress }: {
  title: string; day: number; totalDays: number; teamName: string; teamPoints: number; pointsToday: number;
  rank: number; teamCount: number; eliminated: boolean; onPress: () => void;
}) {

  const { T, ty } = useTheme();
  const c = { title, currentDay: day, totalDays, teamName, teamRank: rank, teamCount, eliminated };
  const open = onPress;
  const stats = [
    // «Серия» показывала номер текущего дня: пропустив пять дней, человек всё
    // равно видел «Серия 12 дн». Настоящей серии в приложении нет — подписываем
    // честно, номером дня челленджа.
    { v: `${c.currentDay}/${c.totalDays}`, l: tr('День') },
    { v: `${teamPoints}`, l: tr('Очки команды') },
    // Раньше здесь было «место в СВОЕЙ команде / число КОМАНД» — 12 / 6.
    // Показываем место команды рядом с её же очками.
    { v: c.teamRank > 0 ? `${c.teamRank} / ${c.teamCount}` : '—', l: tr('Место команды') },
  ];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={open} style={{ borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: T.cardBg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <StatusBadge label={String((tr('Активный челлендж')))} tone="inverse" icon="flame.fill" />
          <StatusBadge label={[(tr('День')), " ", (c.currentDay), "/", (c.totalDays)].join('')} tone="inverse" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Logo size={22} body="#fff" head="#fff" />
          <Text style={[ty.title2, { color: '#fff', flex: 1 }]}>{c.title}</Text>
        </View>
        <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>{c.teamName ? `${tr('Команда')} «${c.teamName}» · ` : ''}{c.eliminated ? tr('очки зафиксированы') : `${tr('сегодня')} +${pointsToday} pts`}</Text>
        <View style={{ marginTop: 12, height: 6, borderRadius: 6, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <View style={{ width: `${(c.totalDays > 0 ? c.currentDay / c.totalDays : 0) * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: 6, borderCurve: 'continuous' }} />
        </View>
      </LinearGradient>
      <View style={{ flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title3, { color: T.label }]}>{st.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{st.l}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <Button label={tr('Войти в челлендж')} icon="arrow.right" onPress={open} size="compact" />
      </View>
    </Pressable>
  );
}
