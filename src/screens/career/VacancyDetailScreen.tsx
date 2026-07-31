import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, Linking } from 'react-native';
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
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{job.company}{job.city ? ` · ${job.city}` : ''}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {job.format ? <Capsule bg={T.fillTertiary} color={T.label}>{job.format}</Capsule> : null}
          {job.salary ? <Capsule bg={T.fillTertiary} color={T.label}>{job.salary}</Capsule> : null}
          {job.postedLabel ? <Capsule bg={T.fillTertiary} color={T.labelSecondary}>{job.postedLabel}</Capsule> : null}
        </View>
      </View>

      {/* Match */}
      {job.match > 0 || job.reason ? (
        <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {job.match > 0 ? (
            <View style={{ alignItems: 'center', minWidth: 70 }}>
              <Text style={[ty.largeTitle, { color: T.brand }]} numberOfLines={1}>{job.match}<Text style={ty.title3}>%</Text></Text>
              <Text style={[ty.caption2, { color: T.labelSecondary, textTransform: 'uppercase' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Совпадение')}</Text>
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

      {/* О компании */}
      {(job.companyWebsite || job.companyValues.length > 0 || job.officeAddress) ? (
        <ListSection header={tr('О компании')}>
          <View style={{ padding: 14, gap: 12 }}>
            {job.companyWebsite ? (
              <Pressable onPress={() => Linking.openURL(job.companyWebsite.startsWith('http') ? job.companyWebsite : `https://${job.companyWebsite}`).catch(() => {})}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SF name="globe" size={18} color={T.brand} />
                <Text style={[ty.subhead, { color: T.brandAccent, flex: 1 }]} numberOfLines={1}>{job.companyWebsite}</Text>
              </Pressable>
            ) : null}
            {job.officeAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SF name="mappin.circle.fill" size={18} color={T.sky} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{job.officeAddress}</Text>
              </View>
            ) : null}
            {job.companyValues.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={[ty.caption2Em, { color: T.labelTertiary, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{tr('Ценности')}</Text>
                {job.companyValues.map((v, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <SF name="checkmark.seal.fill" size={15} color={T.brand} />
                    <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{v}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ListSection>
      ) : null}

      {/* Условия */}
      {(job.conditions || job.benefits.length > 0) ? (
        <ListSection header={tr('Условия')}>
          <View style={{ padding: 14, gap: 12 }}>
            {job.conditions ? <Text style={[ty.body, { color: T.label }]}>{job.conditions}</Text> : null}
            {job.benefits.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={[ty.caption2Em, { color: T.labelTertiary, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{tr('Преимущества')}</Text>
                {job.benefits.map((b, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <SF name="star.fill" size={14} color="#FF9500" />
                    <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ListSection>
      ) : null}

      {/* Требования */}
      {(job.experience.length > 0 || job.diplomaRequired !== null || job.adjacentFields || job.otherRequirements) ? (
        <ListSection header={tr('Требования')}>
          <View style={{ padding: 14, gap: 12 }}>
            {job.experience.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {job.experience.map((e) => (
                  <Capsule key={e} bg={T.fillTertiary} color={T.label}><SF name="clock" size={11} color={T.labelSecondary} />{e}</Capsule>
                ))}
              </View>
            ) : null}
            {job.diplomaRequired !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SF name={job.diplomaRequired ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={18} color={job.diplomaRequired ? T.green : T.labelTertiary} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{tr('Диплом по специальности')}: {job.diplomaRequired ? tr('обязателен') : tr('не обязателен')}</Text>
              </View>
            ) : null}
            {job.adjacentFields ? (
              <View style={{ gap: 3 }}>
                <Text style={[ty.subhead, { color: T.label }]}>{tr('Смежные сферы')}: {job.adjacentFields}</Text>
                <Text style={[ty.caption1, { color: T.labelTertiary }]}>{tr('Допустимый опыт в смежных сферах, который готов рассматривать работодатель')}</Text>
              </View>
            ) : null}
            {job.otherRequirements ? <Text style={[ty.body, { color: T.label }]}>{job.otherRequirements}</Text> : null}
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
