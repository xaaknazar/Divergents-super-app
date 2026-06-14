import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, ListSection, ListRow, PrimaryButton, T, ty } from '../../components/ui';
import { CAREER_FILTERS, BEST_MATCH, JOBS } from '../../data/career';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'CareerHome'>;

export function CareerHomeScreen({}: Props) {
  const [filter, setFilter] = useState(0);

  return (
    <Screen>
      <NavBarLarge title="Карьера" trailing={<>
        <HeaderIcon name="magnifyingglass" />
        <HeaderIcon name="bell.fill" />
      </>} />

      <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 12 }]}>12 новых вакансий под ваш профиль</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {CAREER_FILTERS.map((c, i) => (
          <Chip key={c.t} label={c.t} active={filter === i} icon={(c as any).icon} onPress={() => setFilter(i)} />
        ))}
      </ScrollView>

      {/* Best match */}
      <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: T.cardBg, borderRadius: 14, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Capsule bg="rgba(255,149,0,0.14)" color={T.orange}><SF name="bolt.fill" size={11} color={T.orange} />Лучшее совпадение</Capsule>
          <SF name="bookmark" size={18} color={T.labelTertiary} />
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#F4F4F4', borderWidth: 0.5, borderColor: T.separator, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[ty.title3, { color: T.brand }]}>{BEST_MATCH.initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.title3, { color: T.label, lineHeight: 24 }]}>{BEST_MATCH.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{BEST_MATCH.company} · {BEST_MATCH.city}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {BEST_MATCH.tags.map((t) => <Capsule key={t} bg={T.fillTertiary} color={T.label}>{t}</Capsule>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <View>
            <Text style={[ty.title1, { color: T.brand }]}>{BEST_MATCH.match}<Text style={ty.title3}>%</Text></Text>
            <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Совпадение</Text>
          </View>
          <Text style={[ty.caption1, { color: T.labelSecondary, flex: 1, lineHeight: 15 }]}>{BEST_MATCH.reason}</Text>
        </View>
        <PrimaryButton label="Откликнуться" style={{ marginTop: 14, height: 44 }} />
      </View>

      {/* List */}
      <ListSection header="Ещё подходящие">
        {JOBS.map((j, i) => (
          <ListRow key={i}
            leading={<View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: j.color }]}>{j.l}</Text></View>}
            title={j.t} subtitle={j.c}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text style={[ty.headline, { color: T.brand }]}>{j.m}%</Text><Text style={[ty.caption2, { color: T.labelSecondary }]}>match</Text></View>}
            chevron last={i === JOBS.length - 1} />
        ))}
      </ListSection>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
