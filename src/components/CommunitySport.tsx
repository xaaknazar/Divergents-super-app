import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable,Text,View } from 'react-native';
import { SportActivity } from '../data/community';
import { CommunityStackParams } from '../navigation/types';
import { useEnrollment } from '../state/EnrollmentContext';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ContentEmptyState } from './ContentEmptyState';
import { ContentLoading } from './ContentLoading';
import { SF } from './SFIcon';
import { ListSection } from './ui';
import { Wrapper } from './Wrapper';

type Nav = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export function CommunitySport({ navigation, sport, error, onRetry }: { navigation: Nav; sport: SportActivity[] | null; error: boolean; onRetry: () => void }) {
  const { T, ty } = useTheme();
  const { statusOf } = useEnrollment();
  if (sport === null) return <ContentLoading />;
  if (!sport.length) return <ContentEmptyState error={error} onRetry={onRetry} icon="figure.walk" title={tr('Пока ничего нет')} subtitle={tr('Спортивные активности появятся здесь.')} />;
  return <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Спортивные активности')}>
    {sport.map(sp => <Pressable key={sp.id} onPress={() => navigation.navigate('SportDetail', { sportId: sp.id })}
      accessibilityRole="button" accessibilityLabel={sp.title}
      style={({ pressed }) => ({ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, opacity: pressed ? 0.6 : 1 })}>
      <SF name={sp.icon} size={26} color={T.brand} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[ty.headline, { color: T.label }]}>{sp.title}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{[sp.place, sp.date].filter(Boolean).join(' · ')}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{sp.going} идут · {sp.spotsLabel} · Бесплатно</Text>
        {statusOf(`sport:${sp.id}`) ? <Text style={[ty.caption1, { color: T.brandText }]}>
          {statusOf(`sport:${sp.id}`) === 'pending' ? 'Заявка на рассмотрении' : 'Вы идёте'}
        </Text> : null}
      </View>
      <SF name="chevron.forward" size={14} color={T.labelTertiary} />
    </Pressable>)}
  </ListSection></Wrapper>;
}
