import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { ProgressBar } from '../../components/ui';
import { useAchievements, EarnedBadge } from '../../data/achievements';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Achievements'>;

export function BadgeTile({ b }: { b: EarnedBadge }) {
  const { T, ty } = useTheme();
  useLang();
  const circle = b.earned ? b.color : T.fillTertiary;
  const iconColor = b.earned ? '#fff' : T.labelTertiary;
  const pct = Math.round(Math.min(1, Math.max(0, b.progress)) * 100);
  // One accessible element: name, status, and progress in a single announcement
  // instead of four separate focus stops per tile.
  const a11y = [
    b.title,
    b.earned ? tr('получено') : tr('заблокировано'),
    !b.earned && b.goal > 1 ? `${tr('прогресс')} ${pct}%, ${Math.min(b.value, b.goal)} ${tr('из')} ${b.goal}` : null,
    b.desc,
  ].filter(Boolean).join('. ');
  return (
    <View accessible accessibilityLabel={a11y}
      style={{ width: '48%', backgroundColor: T.cardBg, borderRadius: 16, padding: 14, opacity: b.earned ? 1 : 0.92 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: circle, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={b.icon} size={22} color={iconColor} />
        </View>
        {b.earned ? <SF name="checkmark.circle.fill" size={20} color={b.color} />
                  : <SF name="lock.fill" size={15} color={T.labelTertiary} />}
      </View>
      <Text style={[ty.headline, { color: T.label, marginTop: 12 }]} numberOfLines={1}>{b.title}</Text>
      <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={2}>{b.desc}</Text>
      {!b.earned && b.goal > 1 ? (
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={b.progress} height={4} color={b.color} />
          <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 4 }]}>{Math.min(b.value, b.goal)}/{b.goal}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function AchievementsScreen({ navigation }: Props) {
  const { T, isDark, ty } = useTheme();
  const { lang } = useLang();
  const { badges, earned, total } = useAchievements();
  const pct = total ? earned / total : 0;
  // Warm cream wash in light mode; a dark-friendly wash in dark mode so the
  // light label text stays readable.
  const gradient = isDark
    ? [T.systemBg, T.systemBg, T.groupedBg]
    : ['#FBF4E6', '#F6F4F1', '#F2F2F7'];

  return (
    <Screen gradient={gradient} topInset={false}>
      <NavHeader
        largeTitle
        title={tr('Достижения')}
        subtitle={lang === 'ru' ? `Получено ${earned} из ${total} бейджей` : `Earned ${earned} of ${total} badges`}
        backLabel={tr('Профиль')}
        onBack={() => navigation.goBack()}
        transparent
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18 }}>
        <ProgressBar value={pct} height={8} />
      </View>

      {/* 2 × 48% tiles; the remaining 4% is the column gutter, rows use rowGap. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, paddingHorizontal: 16, justifyContent: 'space-between' }}>
        {badges.map((b) => <BadgeTile key={b.id} b={b} />)}
      </View>
      <View style={{ height: 30 }} />
    </Screen>
  );
}
