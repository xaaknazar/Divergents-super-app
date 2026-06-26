import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, PrimaryButton, ty } from '../../components/ui';
import { ListSkeleton, EmptyState } from '../../components/StateViews';
import { Job, fetchVacancy } from '../../data/career';
import { useCareer } from '../../state/CareerContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { talentMatch } from '../../data/talentslab';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'VacancyDetail'>;

export function VacancyDetailScreen({ route, navigation }: Props) {
  const { T, isDark } = useTheme();
  useLang();
  const { jobId } = route.params;
  const { getJob, jobsLoading, hydrated, isApplied, isSaved, apply, toggleSave } = useCareer();
  const { profile, live } = useTalentProfile();

  const fromList = getJob(jobId);
  const [fetched, setFetched] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);

  // If the vacancy isn't in the loaded list (deep link / stale list), fetch it
  // directly once the list has settled.
  useEffect(() => {
    if (fromList || jobsLoading) return;
    let active = true;
    setNotFound(false);
    fetchVacancy(jobId).then((j) => {
      if (!active) return;
      if (j) setFetched(j); else setNotFound(true);
    });
    return () => { active = false; };
  }, [fromList, jobsLoading, jobId, retry]);

  const job = fromList ?? fetched;
  const gallup = live ? profile?.gallup ?? [] : [];

  // ── Not found / failed to load ────────────────────────────────────
  // fetchVacancy resolves null both for a removed vacancy and a network
  // failure, so the copy is honest about both and offers a retry. Back is
  // always available in the nav bar.
  if (notFound && !job) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Карьера')} onBack={() => navigation.goBack()} />
        <EmptyState icon="briefcase" title={tr('Не удалось открыть вакансию')}
          subtitle={tr('Возможно, она снята с публикации или нет связи. Повторите попытку или вернитесь к списку.')}
          actionLabel={tr('Повторить')} onAction={() => setRetry((n) => n + 1)} />
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Карьера')} onBack={() => navigation.goBack()} />
        <View style={{ paddingTop: 16 }}><ListSkeleton rows={5} /></View>
      </View>
    );
  }

  const applied = isApplied(job.id);

  return (
    <Screen gradient={isDark ? [T.systemBg, T.groupedBg, T.secondaryBg] : ['#EAF4EF', '#F3F6F4', '#F2F2F7']} topInset={false} tabPadding={false}>
      <NavHeader backLabel={tr('Карьера')} onBack={() => navigation.goBack()} transparent trailing={
        <Pressable onPress={() => toggleSave(job.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Сохранить')}>
          <SF name={isSaved(job.id) ? 'bookmark.fill' : 'bookmark'} size={20} color={T.brandAccent} />
        </Pressable>
      } />

      {/* Hero */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
            <Text style={[ty.title1, { color: job.color }]}>{job.logo}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.title2, { color: T.label }]}>{job.title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{job.company}{job.city ? ` · ${job.city}` : ''}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {job.format ? <Capsule bg={T.fillTertiary} color={T.label}>{job.format}</Capsule> : null}
          {job.salary ? <Capsule bg={T.fillTertiary} color={T.label}>{job.salary}</Capsule> : null}
          {job.level ? <Capsule bg={T.fillTertiary} color={T.label}>{job.level}</Capsule> : null}
          {job.postedLabel ? <Capsule bg={T.fillTertiary} color={T.labelSecondary}>{job.postedLabel}</Capsule> : null}
        </View>
      </View>

      {/* Match */}
      {job.match > 0 || job.reason ? (
        <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {job.match > 0 ? (
            <View style={{ alignItems: 'center', minWidth: 70 }}>
              <Text style={[ty.largeTitle, { color: T.brand }]}>{job.match}<Text style={ty.title3}>%</Text></Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]}>{tr('Совпадение')}</Text>
            </View>
          ) : null}
          {job.reason ? <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{job.reason}</Text> : null}
        </View>
      ) : null}

      {/* Why you fit — talents (matched against your live Gallup profile) */}
      {job.talents.length > 0 ? (() => {
        const m = talentMatch(job.talents, gallup);
        return (
          <ListSection header={tr('Почему вам подходит')}>
            <View style={{ padding: 14 }}>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginBottom: 10 }]}>
                {tr('Таланты Gallup для роли')} · {tr('совпадает')} {m.matched} {tr('из')} {m.total} {tr('ваших')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {m.items.map((it) => (
                  <Capsule key={it.name} bg={it.has ? 'rgba(52,199,89,0.14)' : T.fillTertiary} color={it.has ? T.green : T.labelSecondary}>
                    <SF name={it.has ? 'checkmark.circle.fill' : 'circle'} size={11} color={it.has ? T.green : T.labelTertiary} />{it.name}
                  </Capsule>
                ))}
              </View>
            </View>
          </ListSection>
        );
      })() : null}

      {/* Good Boss / Good Company */}
      {job.goodBoss ? (
        <ListSection header="Good Boss">
          <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
            <SF name="person.crop.circle.fill" size={22} color={T.brand} />
            <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{job.goodBoss}</Text>
          </View>
        </ListSection>
      ) : null}
      {job.goodCompany ? (
        <ListSection header="Good Company">
          <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
            <SF name="building.2.fill" size={22} color={T.green} />
            <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{job.goodCompany}</Text>
          </View>
        </ListSection>
      ) : null}

      {/* Requirements */}
      {job.requirements.length > 0 ? (
        <ListSection header={tr('Требования')}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
            {job.requirements.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: i < job.requirements.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <SF name="checkmark.circle.fill" size={18} color={T.green} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{r}</Text>
              </View>
            ))}
          </View>
        </ListSection>
      ) : null}

      {/* About */}
      {job.about ? (
        <ListSection header={tr('О вакансии')}>
          <View style={{ padding: 14 }}>
            <Text style={[ty.body, { color: T.label }]}>{job.about}</Text>
          </View>
        </ListSection>
      ) : null}

      <View style={{ padding: 16, paddingTop: 20 }}>
        <PrimaryButton
          label={applied ? tr('Отклик отправлен ✓') : tr('Откликнуться')}
          icon={applied ? 'checkmark' : 'paperplane.fill'}
          color={applied ? T.green : T.brand}
          disabled={!hydrated}
          onPress={() => apply(job.id)}
        />
      </View>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
