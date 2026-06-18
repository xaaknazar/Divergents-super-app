import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, LayoutAnimation } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, ListSection, ListRow, SectionHeader, ty } from '../../components/ui';
import { JOBS, CAREER_FILTERS, GOOD_FIT, Job } from '../../data/career';
import { useCareer } from '../../state/CareerContext';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'CareerHome'>;

function matchesFilter(j: Job, f: string): boolean {
  switch (f) {
    case 'Алматы': return j.city.includes('Алматы');
    case 'Удалёнка': return j.format === 'Удалёнка';
    case 'HR': return /HR|People|персонал|обучен|L&D|CHRO/i.test(j.title);
    case 'Senior+': return /Senior|C-level|Lead|Head|Директор|CHRO/i.test(`${j.level} ${j.title}`);
    default: return true; // Под профиль
  }
}

export function CareerHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const [filter, setFilter] = useState(0);
  const { applied, isApplied } = useCareer();

  const sorted = useMemo(() => [...JOBS].sort((a, b) => b.match - a.match), []);
  const best = sorted[0];
  const filtered = useMemo(
    () => sorted.filter((j) => matchesFilter(j, CAREER_FILTERS[filter])),
    [filter, sorted]
  );
  const rest = filtered.filter((j) => j.id !== best.id || filter !== 0);
  const myJobs = JOBS.filter((j) => applied.includes(j.id));

  const open = (id: string) => navigation.navigate('VacancyDetail', { jobId: id });

  return (
    <Screen gradient={['#EAF4EF', '#F3F6F4', '#F2F2F7']}>
      <NavBarLarge title="Карьера" trailing={<>
        <HeaderIcon name="magnifyingglass" />
        <HeaderIcon name="bell.fill" />
      </>} />
      <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 12 }]}>
        {JOBS.length} вакансий подобраны по вашему психотипу и талантам
      </Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {CAREER_FILTERS.map((c, i) => (
          <Chip key={c} label={c} active={filter === i} icon={i === 0 ? 'sparkles' : undefined} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilter(i); }} />
        ))}
      </ScrollView>

      {/* Best match (only on Под профиль) */}
      {filter === 0 ? (
        <>
          <SectionHeader title="Лучшее совпадение" />
          <Pressable onPress={() => open(best.id)} style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Capsule bg="rgba(255,149,0,0.14)" color={T.orange}><SF name="bolt.fill" size={11} color={T.orange} />Лучшее совпадение</Capsule>
              <SF name={isApplied(best.id) ? 'checkmark.circle.fill' : 'bookmark'} size={18} color={isApplied(best.id) ? T.green : T.labelTertiary} />
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.title3, { color: best.color }]}>{best.logo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.title3, { color: T.label, lineHeight: 24 }]}>{best.title}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{best.company} · {best.city}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <Capsule bg={T.fillTertiary} color={T.label}>{best.format}</Capsule>
              <Capsule bg={T.fillTertiary} color={T.label}>{best.salary}</Capsule>
              <Capsule bg={T.fillTertiary} color={T.label}>{best.level}</Capsule>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: T.separator }}>
              <View>
                <Text style={[ty.title1, { color: T.brand }]}>{best.match}<Text style={ty.title3}>%</Text></Text>
                <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Совпадение</Text>
              </View>
              <Text style={[ty.caption1, { color: T.labelSecondary, flex: 1, lineHeight: 16 }]}>{best.reason}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={[ty.subheadEm, { color: T.brand }]}>Открыть</Text>
                <SF name="chevron.forward" size={12} color={T.brand} />
              </View>
            </View>
          </Pressable>

          {/* Good Boss / Good Company */}
          <SectionHeader title="Что вам подходит" />
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
              <SF name="person.crop.circle.fill" size={22} color={T.brand} />
              <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]}>{GOOD_FIT.bossTitle}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.bossText}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
              <SF name="building.2.fill" size={22} color={T.green} />
              <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]}>{GOOD_FIT.companyTitle}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.companyText}</Text>
            </View>
          </View>
        </>
      ) : null}

      {/* My applications */}
      {myJobs.length > 0 ? (
        <ListSection header={`Мои отклики · ${myJobs.length}`}>
          {myJobs.map((j, i) => (
            <ListRow key={j.id} onPress={() => open(j.id)}
              leading={<View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
              title={j.title} subtitle={`${j.company} · ${j.city}`}
              trailing={<Capsule bg="rgba(52,199,89,0.15)" color={T.green}>Отправлен</Capsule>}
              last={i === myJobs.length - 1} />
          ))}
        </ListSection>
      ) : null}

      {/* Job list */}
      <ListSection header={filter === 0 ? 'Ещё подходящие' : `Найдено: ${rest.length}`}>
        {rest.map((j, i) => (
          <ListRow key={j.id} onPress={() => open(j.id)}
            leading={<View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: j.color }]}>{j.logo}</Text></View>}
            title={j.title} subtitle={`${j.company} · ${j.city} · ${j.format} · ${j.salary}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text style={[ty.headline, { color: T.brand }]}>{j.match}%</Text><Text style={[ty.caption2, { color: T.labelSecondary }]}>совпад.</Text></View>}
            chevron last={i === rest.length - 1} />
        ))}
        {rest.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Ничего не найдено</Text></View>
        ) : null}
      </ListSection>
      <View style={{ height: 16 }} />
    </Screen>
  );
}
