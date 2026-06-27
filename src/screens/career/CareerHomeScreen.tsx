import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, LayoutAnimation } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { useNotifications } from '../../state/NotificationsContext';
import { SF } from '../../components/SFIcon';
import { Capsule, Chip, ListSection, ListRow, SectionHeader, ty } from '../../components/ui';
import { ListSkeleton, EmptyState, ErrorState } from '../../components/StateViews';
import { Ring } from '../../components/talentUI';
import { CAREER_FILTERS, GOOD_FIT, Job } from '../../data/career';
import { useCareer } from '../../state/CareerContext';
import { useResume } from '../../state/useResume';
import { useTalentProfile } from '../../state/useTalentProfile';
import { talentMatch, GallupTalent } from '../../data/talentslab';
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
  const { t } = useLang();
  const [filter, setFilter] = useState(0);
  const { applied, isApplied, jobs, jobsLoading, jobsError, reloadJobs, saved, getJob } = useCareer();
  const { profile, live, reload: reloadProfile } = useTalentProfile();
  const { unread } = useNotifications();

  // Only use real (live) Gallup talents for matching — never demo data.
  const gallup: GallupTalent[] = live ? profile?.gallup ?? [] : [];

  const sorted = useMemo(() => [...jobs].sort((a, b) => b.match - a.match), [jobs]);
  const best = sorted[0];
  const filtered = useMemo(() => sorted.filter((j) => matchesFilter(j, CAREER_FILTERS[filter])), [filter, sorted]);
  const rest = best ? filtered.filter((j) => j.id !== best.id || filter !== 0) : filtered;
  const myJobs = jobs.filter((j) => applied.includes(j.id));
  // Saved vacancies, resolved against the loaded catalog. Ones that are no
  // longer published (getJob → undefined) are dropped so bookmarks never become
  // a dead, untappable row.
  const savedJobs = useMemo(() => saved.map((id) => getJob(id)).filter((j): j is Job => !!j), [saved, jobs, getJob]);

  const open = (id: string) => navigation.navigate('VacancyDetail', { jobId: id });

  const empty = !jobsLoading && !jobsError && jobs.length === 0;

  return (
    <Screen largeTitle={t('tab_career')} onRefresh={async () => { await Promise.all([reloadProfile(), reloadJobs()]); }}>
      <NavBarLarge title={t('tab_career')} trailing={(
        <HeaderIcon name="bell.fill" color={T.brand} badge={unread} onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />
      )} />

      <ResumeHero navigation={navigation} completeness={live ? profile?.completeness ?? 0 : -1} profile={profile} liveData={live} />

      {/* Vacancies */}
      <SectionHeader title={t('vacancies')} />
      <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 12, marginTop: -4 }]}>
        {tr('Подобраны по вашему психотипу и талантам')}
      </Text>

      {jobsError && jobs.length === 0 ? (
        <ErrorState message={tr('Не удалось загрузить вакансии. Проверьте подключение к интернету.')} onRetry={() => reloadJobs()} />
      ) : empty ? (
        <EmptyState icon="briefcase" title={tr('Пока нет вакансий')}
          subtitle={tr('Здесь появятся вакансии, подобранные под ваш профиль. Загляните позже.')}
          actionLabel={tr('Обновить')} onAction={() => reloadJobs()} />
      ) : jobsLoading && jobs.length === 0 ? (
        <View style={{ paddingTop: 8 }}><ListSkeleton rows={4} /></View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
            {CAREER_FILTERS.map((c, i) => (
              <Chip key={c} label={c} active={filter === i} icon={i === 0 ? 'sparkles' : undefined}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setFilter(i); }} />
            ))}
          </ScrollView>

          {filter === 0 && best ? (
            <>
              <JobCard job={best} best onPress={() => open(best.id)} applied={isApplied(best.id)} gallup={gallup} />
              {/* Good fit */}
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
                <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
                  <SF name="person.crop.circle.fill" size={22} color={T.brand} />
                  <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]} numberOfLines={1}>{GOOD_FIT.bossTitle}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.bossText}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
                  <SF name="building.2.fill" size={22} color={T.green} />
                  <Text style={[ty.subheadEm, { color: T.label, marginTop: 8 }]} numberOfLines={1}>{GOOD_FIT.companyTitle}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4 }]}>{GOOD_FIT.companyText}</Text>
                </View>
              </View>
            </>
          ) : null}

          {myJobs.length > 0 ? (
            <ListSection header={`${tr('Мои отклики')} · ${myJobs.length}`}>
              {myJobs.map((j, i) => (
                <ListRow key={j.id} onPress={() => open(j.id)}
                  leading={<View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
                  title={j.title} subtitle={`${j.company} · ${j.city}`}
                  trailing={<Capsule bg="rgba(52,199,89,0.15)" color={T.green}>{tr('Отправлен')}</Capsule>}
                  last={i === myJobs.length - 1} />
              ))}
            </ListSection>
          ) : null}

          {savedJobs.length > 0 ? (
            <ListSection header={`${tr('Сохранённые')} · ${savedJobs.length}`}>
              {savedJobs.map((j, i) => (
                <ListRow key={j.id} onPress={() => open(j.id)}
                  leading={<View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
                  title={j.title} subtitle={`${j.company} · ${j.city}`}
                  trailing={<SF name="bookmark.fill" size={15} color={T.brandAccent} />}
                  last={i === savedJobs.length - 1} />
              ))}
            </ListSection>
          ) : null}

          <SectionHeader title={filter === 0 ? tr('Ещё подходящие') : `${tr('Найдено')}: ${rest.length}`} />
          {rest.map((j) => <JobCard key={j.id} job={j} onPress={() => open(j.id)} applied={isApplied(j.id)} gallup={gallup} />)}
          {rest.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Ничего не найдено')}</Text></View>
          ) : null}
        </>
      )}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// ─── Resume completeness hero (gradient) — single «Моя анкета» entry ─
// `completeness` < 0 means "no live profile" → use the local resume %.
// The whole card is tappable → TalentProfile (editing lives inside it).
function ResumeHero({ navigation, completeness: live, profile, liveData }: {
  navigation: Nav; completeness: number;
  profile: ReturnType<typeof useTalentProfile>['profile']; liveData: boolean;
}) {
  const { T } = useTheme();
  const { completeness: local } = useResume();
  const completeness = live >= 0 ? live : local;
  const filled = completeness > 0;
  const mbti = liveData ? profile?.mbtiType : null;
  const talents = liveData ? profile?.gallup.length ?? 0 : 0;
  const subtitle = liveData
    ? [mbti ? `MBTI · ${mbti}` : null, talents > 0 ? `${talents} ${tr('талантов Gallup')}` : null].filter(Boolean).join(' · ')
      || tr('Дополните профиль для точного подбора')
    : (filled ? tr('Дополните профиль для точного подбора') : tr('Заполните анкету — подберём роли по талантам'));
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 20, overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
      <Pressable onPress={() => navigation.navigate('TalentProfile')}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Ring value={completeness / 100} size={64} color="#fff" label={`${completeness}%`} textColor="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={[ty.title3, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Моя анкета')}</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {subtitle}
              </Text>
            </View>
            <SF name="chevron.right" size={17} color="rgba(255,255,255,0.85)" />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Vacancy card ──────────────────────────────────────────────────
function JobCard({ job, onPress, applied, best, gallup }: {
  job: Job; onPress: () => void; applied: boolean; best?: boolean; gallup: GallupTalent[];
}) {
  const { T } = useTheme();
  const m = talentMatch(job.talents, gallup);
  return (
    <Pressable onPress={onPress}
      style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: best ? 0 : 0.5, borderColor: T.cardBorder, ...(best ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : null) }}>
      {best ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 }}>
          <SF name="bolt.fill" size={12} color={T.orange} />
          <Text style={[ty.caption2Em, { color: T.orange, textTransform: 'uppercase' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Лучшее совпадение')}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ty.title3, { color: job.color }]}>{job.logo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{job.title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{job.company}{job.city ? ` · ${job.city}` : ''}</Text>
        </View>
        {job.match > 0 ? <Ring value={job.match / 100} size={52} stroke={5} color={T.brand} label={`${job.match}%`} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {job.format ? <Capsule bg={T.fillTertiary} color={T.label}>{job.format}</Capsule> : null}
        {job.salary ? <Capsule bg={T.fillTertiary} color={T.label}>{job.salary}</Capsule> : null}
        {m.matched > 0 ? <Capsule bg="rgba(52,199,89,0.14)" color={T.green}><SF name="checkmark.seal.fill" size={11} color={T.green} />{m.matched} {tr('ваших таланта')}</Capsule> : null}
        {applied ? <Capsule bg="rgba(52,199,89,0.15)" color={T.green}>{tr('Отклик отправлен')}</Capsule> : null}
      </View>
    </Pressable>
  );
}
