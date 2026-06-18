import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, IconCircle, IconSquircle, ListSection, ListRow, Segmented, ty } from '../../components/ui';
import { TALENTS, REPORTS } from '../../data/profile';
import { JOBS } from '../../data/career';
import { useChallenge } from '../../state/ChallengeContext';
import { useCourses } from '../../state/CourseContext';
import { useCareer } from '../../state/CareerContext';
import { useAchievements } from '../../data/achievements';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: Props) {
  const { T, mode, setMode } = useTheme();
  const { challenge } = useChallenge();
  const { courses, progress } = useCourses();
  const { applied } = useCareer();
  const ach = useAchievements();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const goAuth = () => navigation.getParent()?.getParent()?.navigate('Auth' as never);
  const goLearning = () => navigation.getParent()?.navigate('LMSTab' as never);
  const goCareer = () => navigation.getParent()?.navigate('CareerTab' as never);

  const coursesInProgress = courses.filter((c) => progress(c.id) > 0).length;
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName
    || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || (email ? email.split('@')[0] : 'Гость');
  const initial = (name?.trim()?.[0] ?? 'D').toUpperCase();

  const challengeActive = challenge.currentDay > 0;
  const stats = [
    { v: String(coursesInProgress), l: 'Курсов' },
    { v: String(ach.earned), l: 'Достижений' },
    { v: challengeActive ? `${challenge.currentDay}/${challenge.totalDays}` : '—', l: 'Челлендж' },
  ];

  const myApps = JOBS.filter((j) => applied.includes(j.id));

  return (
    <Screen gradient={['#F1EDFA', '#F5F3F8', '#F2F2F7']}>
      <NavBarLarge title="Профиль" />

      {/* Hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={[ty.largeTitle, { color: '#fff' }]}>{initial}</Text>
        </View>
        <Text style={[ty.title1, { color: T.label }]}>{name}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>
          {isSignedIn ? (email ?? 'Divergents') : 'Войдите, чтобы синхронизировать профиль'}
        </Text>
      </View>

      {/* Stats row */}
      <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.cardBg, borderRadius: 14, flexDirection: 'row', paddingVertical: 14 }}>
        {stats.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
            <Text style={[ty.title2, { color: T.label }]}>{s.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Achievements */}
      <ListSection header={`Достижения · ${ach.earned}/${ach.total}`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          {ach.badges.map((b) => (
            <View key={b.id} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: b.earned ? b.color : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={b.icon} size={20} color={b.earned ? '#fff' : T.labelTertiary} />
            </View>
          ))}
        </ScrollView>
        <ListRow title="Смотреть все достижения" valueColor={T.brand} chevron last onPress={() => navigation.navigate('Achievements')} />
      </ListSection>

      {/* Account / Clerk auth */}
      <ListSection header="Аккаунт">
        {isSignedIn ? (
          <>
            <ListRow leading={<IconCircle icon="person.crop.circle.fill" color="#fff" bg={T.brand} size={30} />}
              title={email ?? 'Вы вошли'} subtitle="Divergents LMS" />
            <ListRow leading={<SF name="arrow.right" size={20} color={T.red} />} title="Выйти" valueColor={T.red} last onPress={() => signOut()} />
          </>
        ) : (
          <ListRow leading={<IconCircle icon="person.crop.circle" color={T.brand} bg={T.brandTinted} size={30} />}
            title="Войти по почте" subtitle="Чтобы видеть свои курсы и видео" chevron last onPress={goAuth} />
        )}
      </ListSection>

      {/* Continue learning (only if something is in progress) */}
      {coursesInProgress > 0 ? (
        <ListSection header="Продолжить">
          <ListRow leading={<IconCircle icon="book.fill" color="#fff" bg={T.brand} size={30} />}
            title="Продолжить обучение" subtitle={`${coursesInProgress} ${coursesInProgress === 1 ? 'курс в работе' : 'курса в работе'}`} chevron last onPress={goLearning} />
        </ListSection>
      ) : null}

      {/* Top talents (Divergents profile feature) */}
      <ListSection header="Топ талантов Gallup">
        {TALENTS.map((tn, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 }}>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary, width: 24 }]}>{String(tn.i).padStart(2, '0')}</Text>
            <Text style={[ty.body, { color: T.label, width: 100 }]}>{tn.t}</Text>
            <View style={{ flex: 1 }}><ProgressBar value={tn.v} /></View>
            <Text style={[ty.footnoteEm, { color: T.labelSecondary, width: 36, textAlign: 'right' }]}>{Math.round(tn.v * 100)}</Text>
            {i < TALENTS.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 52, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
          </View>
        ))}
        <ListRow title="Смотреть все 34 таланта" valueColor={T.brand} chevron last leading={<View style={{ width: 24 }} />} />
      </ListSection>

      {/* Reports */}
      <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 16, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Отчёты Divergents</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 }}>
        {REPORTS.map((r) => (
          <View key={r.k} style={{ width: '47.6%', backgroundColor: T.cardBg, borderRadius: 14, padding: 14 }}>
            <IconSquircle icon={r.icon} bg={r.color} size={32} />
            <Text style={[ty.headline, { color: T.label, marginTop: 10 }]}>{r.k}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{r.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <SF name="checkmark.circle.fill" size={11} color={T.green} />
              <Text style={[ty.caption2Em, { color: T.green }]}>Готов</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Active challenge (real, only when active) */}
      {challengeActive ? (
        <ListSection header="Активный челлендж" style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]}>{challenge.title}</Text>
              <View style={{ marginTop: 6 }}><ProgressBar value={challenge.currentDay / challenge.totalDays} /></View>
            </View>
            <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>{challenge.currentDay}/{challenge.totalDays}</Text>
          </View>
        </ListSection>
      ) : null}

      {/* Applications (real, from Career) */}
      {myApps.length > 0 ? (
        <ListSection header={`Отклики на вакансии · ${myApps.length}`}>
          {myApps.map((j, i) => (
            <ListRow key={j.id} onPress={goCareer}
              leading={<View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
              title={j.title} subtitle={`${j.company} · ${j.city}`}
              trailing={<Capsule bg="rgba(52,199,89,0.15)" color={T.green}>Отправлен</Capsule>}
              last={i === myApps.length - 1} />
          ))}
        </ListSection>
      ) : null}

      {/* Appearance */}
      <ListSection header="Внешний вид">
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SF name="paintpalette.fill" size={18} color={T.brandAccent} />
            <Text style={[ty.body, { color: T.label, flex: 1 }]}>Тема оформления</Text>
          </View>
          <Segmented
            items={['Система', 'Светлая', 'Тёмная']}
            value={mode === 'system' ? 0 : mode === 'light' ? 1 : 2}
            onChange={(i) => setMode(i === 0 ? 'system' : i === 1 ? 'light' : 'dark')}
            leadingIcons={['gearshape.fill', 'sun.max.fill', 'moon.fill']}
          />
        </View>
      </ListSection>

      <View style={{ height: 30 }} />
    </Screen>
  );
}
