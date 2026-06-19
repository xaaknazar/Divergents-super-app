import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, LayoutAnimation, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, ListSection, ListRow, SectionHeader, ty } from '../../components/ui';
import { Ring, DomainBar } from '../../components/talentUI';
import { JOBS, CAREER_FILTERS, GOOD_FIT, Job } from '../../data/career';
import { useCareer } from '../../state/CareerContext';
import { useResume } from '../../state/useResume';
import { useTalentProfile } from '../../state/useTalentProfile';
import { talentMatch, mbtiName, GALLUP_DOMAIN_META } from '../../data/talentslab';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'CareerHome'>;
type Nav = Props['navigation'];

function matchesFilter(j: Job, f: string): boolean {
  switch (f) {
    case 'Алматы': return j.city.includes('Алматы');
    case 'Удалёнка': return j.format === 'Удалёнка';
    case 'HR': return /HR|People|персонал|обучен|L&D|CHRO/i.test(j.title);
    case 'Senior+': return /Senior|C-level|Lead|Head|Директор|CHRO/i.test(`${j.level} ${j.title}`);
    default: return true;
  }
}

export function CareerHomeScreen({ navigation }: Props) {
  const { T } = useTheme();
  const [filter, setFilter] = useState(0);
  const { applied, isApplied } = useCareer();
  const { profile } = useTalentProfile();

  const sorted = useMemo(() => [...JOBS].sort((a, b) => b.match - a.match), []);
  const best = sorted[0];
  const filtered = useMemo(() => sorted.filter((j) => matchesFilter(j, CAREER_FILTERS[filter])), [filter, sorted]);
  const rest = filtered.filter((j) => j.id !== best.id || filter !== 0);
  const myJobs = JOBS.filter((j) => applied.includes(j.id));

  const open = (id: string) => navigation.navigate('VacancyDetail', { jobId: id });

  return (
    <Screen>
      <NavBarLarge title="Карьера" />

      <ResumeHero navigation={navigation} />
      <TalentsSnapshot navigation={navigation} profile={profile} />

      {/* Vacancies */}
      <SectionHeader title="Вакансии" />
      <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 12, marginTop: -4 }]}>
        Подобраны по вашему психотипу и талантам
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        {CAREER_FILTERS.map((c, i) => (
          <Chip key={c} label={c} active={filter === i} icon={i === 0 ? 'sparkles' : undefined}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilter(i); }} />
        ))}
      </ScrollView>

      {filter === 0 ? (
        <>
          <JobCard job={best} best onPress={() => open(best.id)} applied={isApplied(best.id)} profile={profile} />
          {/* Good fit */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
              <SF name="person.crop.circle.fill" size={22} color={T.brand} />
              <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]}>{GOOD_FIT.bossTitle}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.bossText}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
              <SF name="building.2.fill" size={22} color={T.green} />
              <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]}>{GOOD_FIT.companyTitle}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.companyText}</Text>
            </View>
          </View>
        </>
      ) : null}

      {myJobs.length > 0 ? (
        <ListSection header={`Мои отклики · ${myJobs.length}`}>
          {myJobs.map((j, i) => (
            <ListRow key={j.id} onPress={() => open(j.id)}
              leading={<View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
              title={j.title} subtitle={`${j.company} · ${j.city}`}
              trailing={<Capsule bg="rgba(52,199,89,0.15)" color={T.green}>Отправлен</Capsule>}
              last={i === myJobs.length - 1} />
          ))}
        </ListSection>
      ) : null}

      <SectionHeader title={filter === 0 ? 'Ещё подходящие' : `Найдено: ${rest.length}`} />
      {rest.map((j) => <JobCard key={j.id} job={j} onPress={() => open(j.id)} applied={isApplied(j.id)} profile={profile} />)}
      {rest.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Ничего не найдено</Text></View>
      ) : null}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// ─── Resume completeness hero (gradient) ───────────────────────────
function ResumeHero({ navigation }: { navigation: Nav }) {
  const { T } = useTheme();
  const { completeness } = useResume();
  const filled = completeness > 0;
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: 'hidden', shadowColor: '#1E337A', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring value={completeness / 100} size={64} color="#fff" label={`${completeness}%`} textColor="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={[ty.title3, { color: '#fff' }]}>Моя анкета</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>
              {filled ? 'Дополните профиль для точного подбора' : 'Заполните анкету — подберём роли по талантам'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable onPress={() => navigation.navigate('Resume')}
            style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            <SF name={filled ? 'square.and.arrow.up' : 'plus'} size={15} color="#1E337A" />
            <Text style={[ty.headline, { color: '#1E337A' }]}>{filled ? 'Анкета' : 'Заполнить'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TalentProfile')}
            style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            <SF name="person.crop.circle.fill" size={15} color="#fff" />
            <Text style={[ty.headline, { color: '#fff' }]}>Профиль</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Strengths snapshot ────────────────────────────────────────────
function TalentsSnapshot({ navigation, profile }: { navigation: Nav; profile: ReturnType<typeof useTalentProfile>['profile'] }) {
  const { T } = useTheme();
  if (!profile || profile.gallup.length === 0) return null;
  const top = profile.gallup.slice(0, 6);
  return (
    <Pressable onPress={() => navigation.navigate('TalentProfile')}
      style={{ marginHorizontal: 16, marginBottom: 18, backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={[ty.title3, { color: T.label }]}>Сильные стороны</Text>
        {profile.mbtiType ? <Capsule bg={T.brandTinted} color={T.brand}>MBTI · {profile.mbtiType}</Capsule> : null}
      </View>
      <DomainBar gallup={profile.gallup} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {top.map((g) => {
          const c = GALLUP_DOMAIN_META[g.domain]?.color ?? T.brand;
          return (
            <View key={g.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c + '18' }}>
              <Text style={[ty.caption2Em, { color: c }]}>{g.rank}</Text>
              <Text style={[ty.footnoteEm, { color: T.label }]}>{g.name}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 }}>
        <Text style={[ty.subheadEm, { color: T.brand }]}>Полный профиль</Text>
        <SF name="chevron.forward" size={12} color={T.brand} />
      </View>
    </Pressable>
  );
}

// ─── Vacancy card ──────────────────────────────────────────────────
function JobCard({ job, onPress, applied, best, profile }: {
  job: Job; onPress: () => void; applied: boolean; best?: boolean;
  profile: ReturnType<typeof useTalentProfile>['profile'];
}) {
  const { T } = useTheme();
  const m = talentMatch(job.talents, profile?.gallup ?? []);
  return (
    <Pressable onPress={onPress}
      style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: best ? 0 : 0.5, borderColor: T.cardBorder, ...(best ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : null) }}>
      {best ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 }}>
          <SF name="bolt.fill" size={12} color={T.orange} />
          <Text style={[ty.caption2Em, { color: T.orange, textTransform: 'uppercase' }]}>Лучшее совпадение</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.title3, { color: job.color }]}>{job.logo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{job.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{job.company} · {job.city}</Text>
        </View>
        <Ring value={job.match / 100} size={52} stroke={5} color={T.brand} label={`${job.match}%`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <Capsule bg={T.fillTertiary} color={T.label}>{job.format}</Capsule>
        <Capsule bg={T.fillTertiary} color={T.label}>{job.salary}</Capsule>
        {m.matched > 0 ? <Capsule bg="rgba(52,199,89,0.14)" color={T.green}><SF name="checkmark.seal.fill" size={11} color={T.green} />{m.matched} ваших таланта</Capsule> : null}
        {applied ? <Capsule bg="rgba(52,199,89,0.15)" color={T.green}>Отклик отправлен</Capsule> : null}
      </View>
    </Pressable>
  );
}
