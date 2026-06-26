import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { Screen } from '../../components/Screen';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, ty } from '../../components/ui';
import { useAchievements, EarnedBadge } from '../../data/achievements';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'Achievements'>;

export function BadgeTile({ b }: { b: EarnedBadge }) {
  const { T } = useTheme();
  useLang();
  const circle = b.earned ? b.color : T.fillTertiary;
  const iconColor = b.earned ? '#fff' : T.labelTertiary;
  return (
    <View style={{ width: '47.6%', backgroundColor: T.cardBg, borderRadius: 16, padding: 14, opacity: b.earned ? 1 : 0.92 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: circle, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={b.icon} size={22} color={iconColor} />
        </View>
        {b.earned ? <SF name="checkmark.circle.fill" size={20} color={b.color} />
                  : <SF name="lock.fill" size={15} color={T.labelTertiary} />}
      </View>
      <Text style={[ty.headline, { color: T.label, marginTop: 12 }]}>{b.title}</Text>
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
  const { T } = useTheme();
  const { lang } = useLang();
  const { badges, earned, total } = useAchievements();
  const pct = total ? earned / total : 0;

  return (
    <Screen gradient={['#FBF4E6', '#F6F4F1', '#F2F2F7']} topInset={false}>
      <BackNav back={tr('Профиль')} onBack={() => navigation.goBack()} transparent />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
        <Text style={[ty.largeTitle, { color: T.label }]}>{tr('Достижения')}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>
          {lang === 'ru' ? `Получено ${earned} из ${total} бейджей` : `Earned ${earned} of ${total} badges`}
        </Text>
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={pct} height={8} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, justifyContent: 'space-between' }}>
        {badges.map((b) => <BadgeTile key={b.id} b={b} />)}
      </View>
      <View style={{ height: 30 }} />
    </Screen>
  );
}
