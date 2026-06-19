import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { NavBarLarge } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { ProgressBar, Capsule, IconCircle, IconSquircle, ListSection, ListRow, Segmented, ty } from '../../components/ui';
import { JOBS } from '../../data/career';
import { useChallenge } from '../../state/ChallengeContext';
import { useCourses } from '../../state/CourseContext';
import { useCareer } from '../../state/CareerContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { GALLUP_DOMAIN_META, mbtiName, fmtList } from '../../data/talentslab';
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
  const { profile } = useTalentProfile();
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
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 14 }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={[ty.largeTitle, { color: '#fff' }]}>{initial}</Text>
          </View>
        )}
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


      {/* Личные данные (Talentslab) */}
      {(() => {
        const rz = profile?.resume ?? null;
        const mk = (items: [string, any][]) => items
          .map(([l, v]) => [l, Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v))] as [string, string])
          .filter(([, v]) => v && v !== 'undefined' && v !== 'false');
        const personal = mk([
          ['Город', rz?.current_city], ['Телефон', rz?.phone], ['Дата рождения', rz?.birth_date],
          ['Пол', rz?.gender], ['Семейное положение', rz?.marital_status], ['Гражданство', rz?.citizenship],
          ['Instagram', rz?.instagram],
        ]);
        const career = mk([
          ['Желаемая должность', rz?.desired_position || fmtList(rz?.desired_positions)],
          ['Сфера', rz?.activity_sphere], ['Опыт (лет)', rz?.total_experience_years],
          ['Зарплата', rz?.expected_salary], ['Языки', fmtList(rz?.language_skills)],
          ['Образование', rz?.school || fmtList(rz?.universities)],
        ]);
        const about = mk([
          ['Хобби', rz?.hobbies], ['Интересы', rz?.interests], ['Спорт', fmtList(rz?.favorite_sports)],
          ['Страны', fmtList(rz?.visited_countries)], ['Книг в год', rz?.books_per_year],
        ]);
        const Sec = (header: string, data: [string, string][]) => data.length === 0 ? null : (
          <ListSection header={header}>
            {data.map(([l, v], i) => (
              <ListRow key={l} title={l} detail={v.length > 24 ? undefined : v} subtitle={v.length > 24 ? v : undefined} last={i === data.length - 1} />
            ))}
          </ListSection>
        );
        return (<>{Sec('Личные данные', personal)}{Sec('Карьера и образование', career)}{Sec('О себе', about)}</>);
      })()}

      {/* Continue learning (only if something is in progress) */}
      {coursesInProgress > 0 ? (
        <ListSection header="Продолжить">
          <ListRow leading={<IconCircle icon="book.fill" color="#fff" bg={T.brand} size={30} />}
            title="Продолжить обучение" subtitle={`${coursesInProgress} ${coursesInProgress === 1 ? 'курс в работе' : 'курса в работе'}`} chevron last onPress={goLearning} />
        </ListSection>
      ) : null}

      {/* MBTI + Top Gallup talents (Talentslab) */}
      {profile?.mbtiType ? (
        <ListSection header="Тип личности">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[ty.subheadEm, { color: '#fff' }]}>{profile.mbtiType}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]}>MBTI · {mbtiName(profile.mbtiType)}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>по тесту Talentslab</Text>
            </View>
          </View>
        </ListSection>
      ) : null}

      {(profile?.gallup ?? []).length > 0 ? (
        <ListSection header="Топ талантов Gallup">
          {profile!.gallup.slice(0, 8).map((g, i, arr) => {
            const c = GALLUP_DOMAIN_META[g.domain]?.color ?? T.brand;
            return (
              <View key={g.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 }}>
                <Text style={[ty.footnoteEm, { color: T.labelSecondary, width: 24 }]}>{String(g.rank).padStart(2, '0')}</Text>
                <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{g.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={[ty.caption2, { color: T.labelSecondary }]}>{GALLUP_DOMAIN_META[g.domain]?.label}</Text>
                </View>
                {i < arr.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 52, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
              </View>
            );
          })}
          <ListRow title="Открыть в разделе «Карьера»" valueColor={T.brand} chevron last leading={<View style={{ width: 24 }} />} onPress={goCareer} />
        </ListSection>
      ) : null}

      {/* Reports (Talentslab) */}
      {(profile?.reports ?? []).length > 0 ? (
        <ListSection header="Отчёты">
          {profile!.reports.map((r, i) => (
            <ListRow key={i} onPress={() => Linking.openURL(r.url)}
              leading={<SF name="doc.fill" size={20} color={T.brand} />}
              title={r.title} trailing={<SF name="arrow.up.circle.fill" size={20} color={T.brand} />}
              last={i === profile!.reports.length - 1} />
          ))}
        </ListSection>
      ) : null}

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
