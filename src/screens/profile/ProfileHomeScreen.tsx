import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, ScrollView, Linking, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { PageIntro } from '../../components/PageIntro';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { useNotifications } from '../../state/NotificationsContext';
import { SF } from '../../components/SFIcon';
import { Capsule, IconCircle, ListSection, ListRow, Segmented, ty } from '../../components/ui';
import { Ring } from '../../components/talentUI';
import { GardnerChart } from '../../components/GardnerChart';
import { JOBS } from '../../data/career';
import { fetchMyShelf, ShelfEntry } from '../../data/books';
import { imgUrl } from '../../data/api';
import { useChallenge } from '../../state/ChallengeContext';
import { useCourses } from '../../state/CourseContext';
import { useCareer } from '../../state/CareerContext';
import { useResume } from '../../state/useResume';
import { useAppFlow } from '../../state/AppFlowContext';
import { useModeration } from '../../state/ModerationContext';
import { useLang, tr } from '../../state/LanguageContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { clearAllAppData } from '../../state/reset';
import { unregisterPushToken } from '../../state/usePush';
import { useAchievements } from '../../data/achievements';
import { GALLUP_DOMAIN_META, mbtiName, fmtList } from '../../data/talentslab';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import { ProfileStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: Props) {
  const { T, mode, setMode } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();
  const { challenge } = useChallenge();
  const { courses, progress, reload: reloadCourses } = useCourses();
  const { applied } = useCareer();
  const { completeness: localCompleteness } = useResume();
  const { profile, live, reload } = useTalentProfile();
  const completeness = profile?.completeness ?? localCompleteness;
  const ach = useAchievements();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { finishRegistration } = useAppFlow();
  const { blocked, unblock } = useModeration();

  // Personal reading shelf (books read / currently reading), cache-first so it
  // shows instantly; tapping opens the book or the Library in the Обучение tab.
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => { if (!isSignedIn) return; try { const tok = await getToken(); const s = await fetchMyShelf(tok); if (alive) setShelf(s); } catch {} })();
    return () => { alive = false; };
  }, [isSignedIn]);
  const reading = shelf.filter((s) => s.status === 'reading');
  const readBooks = shelf.filter((s) => s.status === 'read');
  const openBook = (id: string) => navigation.getParent()?.navigate('LMSTab', { screen: 'BookDetail', params: { bookId: id } } as never);
  const openLibrary = () => navigation.getParent()?.navigate('LMSTab', { screen: 'Books' } as never);

  // Let users review and lift blocks (App Store 1.2 requires blocking be reversible).
  const manageBlocked = () => {
    Alert.alert('Заблокированные', blocked.join('\n'), [
      { text: 'Разблокировать всех', style: 'destructive', onPress: () => blocked.forEach((b) => unblock(b)) },
      { text: tr('Готово'), style: 'cancel' },
    ]);
  };

  const goLearning = () => navigation.getParent()?.navigate('LMSTab' as never);
  const goCareer = () => navigation.getParent()?.navigate('CareerTab' as never);
  // Open the anketa (resume) editor within the Profile stack so closing it
  // returns to the profile (not the Career tab).
  const editAnketa = () => navigation.navigate('Resume' as never);

  const handleSignOut = () => {
    Alert.alert(
      'Выйти из аккаунта?',
      undefined,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            finishRegistration();
            try { await unregisterPushToken(getToken); } catch {}
            try { await clearAllAppData(); } catch {}
            try { await signOut(); } catch {}
          },
        },
      ],
    );
  };

  const coursesInProgress = courses.filter((c) => progress(c.id) > 0).length;
  const email = user?.primaryEmailAddress?.emailAddress;
  // Prefer a real name: Clerk name → Talentslab anketa full_name → email prefix.
  // Email-code sign-up doesn't collect a name, so the anketa is the real source.
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || (live && profile?.fullName ? profile.fullName : null)
    || (email ? email.split('@')[0] : 'Divergents');
  const initial = (name?.trim()?.[0] ?? 'D').toUpperCase();
  const challengeActive = challenge.currentDay > 0;
  const myApps = JOBS.filter((j) => applied.includes(j.id));
  const rz = profile?.resume ?? null;

  const tiles = [
    { v: String(coursesInProgress), l: tr('Курсов'), icon: 'book.fill', c: T.brand },
    { v: `${ach.earned}`, l: 'Достижений', icon: 'rosette', c: T.orange },
    { v: challengeActive ? String(challenge.currentDay) : '—', l: 'День челленджа', icon: 'flame.fill', c: T.red },
  ];

  const mk = (items: [string, any][]) => items
    .map(([l, v]) => [l, Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v))] as [string, string])
    .filter(([, v]) => v && v !== 'undefined' && v !== 'false');
  const personal = mk([
    ['Город', rz?.current_city], ['Телефон', rz?.phone], ['Дата рождения', rz?.birth_date],
    ['Пол', rz?.gender], ['Семейное положение', rz?.marital_status], ['Гражданство', rz?.citizenship], ['Instagram', rz?.instagram],
  ]);
  const career = mk([
    ['Желаемая должность', rz?.desired_position || fmtList(rz?.desired_positions)], ['Сфера', rz?.activity_sphere],
    ['Опыт (лет)', rz?.total_experience_years], ['Зарплата', rz?.expected_salary],
    ['Языки', fmtList(rz?.language_skills)], ['Образование', rz?.school || fmtList(rz?.universities)],
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

  return (
    <Screen largeTitle="Профиль" onRefresh={async () => { reloadCourses(); await reload(); }}>
      <PageIntro page="profile" />
      <NavBarLarge title={t('profile')} trailing={(
        <HeaderIcon name="bell.fill" color={T.brand} badge={unread} label="Уведомления" onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />
      )} />

      {/* Gradient hero card — tap to edit the anketa (single edit entry) */}
      <Pressable onPress={editAnketa} accessibilityRole="button" accessibilityLabel="Редактировать анкету"
        style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={{ width: 64, height: 64, borderRadius: 18 }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.title1, { color: '#fff' }]}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[ty.title2, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{name}</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.85)', marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {email ?? 'Divergents'}
              </Text>
              {profile?.mbtiType ? (
                <View style={{ marginTop: 8 }}>
                  <Capsule bg="rgba(255,255,255,0.2)" color="#fff"><SF name="sparkles" size={11} color="#fff" />MBTI · {profile.mbtiName || `${profile.mbtiType} ${mbtiName(profile.mbtiType)}`}</Capsule>
                </View>
              ) : null}
            </View>
            <Ring value={completeness / 100} size={62} color="#fff" label={`${completeness}%`} sub={t('questionnaire')} textColor="#fff" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.22)' }}>
            <Text style={[ty.footnoteEm, { color: '#fff' }]}>Редактировать анкету</Text>
            <SF name="chevron.right" size={12} color="rgba(255,255,255,0.85)" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
        {tiles.map((t, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
            <SF name={t.icon} size={18} color={t.c} />
            <Text style={[ty.title2, { color: T.label, marginTop: 8 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.l}</Text>
          </View>
        ))}
      </View>

      {/* Achievements */}
      <ListSection header={`${t('achievements_n')} · ${ach.earned}/${ach.total}`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          {ach.badges.map((b) => (
            <View key={b.id} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: b.earned ? b.color : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={b.icon} size={20} color={b.earned ? '#fff' : T.labelTertiary} />
            </View>
          ))}
        </ScrollView>
        <ListRow title={t('view_all_ach')} valueColor={T.brand} chevron last onPress={() => navigation.navigate('Achievements')} />
      </ListSection>

      {/* My books — reading now / read, with a link into the Library */}
      <ListSection header={tr('Мои книги')} style={{ marginTop: 18 }}>
        {reading.slice(0, 2).map((s) => (
          <ListRow key={s.book.id} onPress={() => openBook(s.book.id)}
            leading={s.book.imageUrl
              ? <Image source={imgUrl(s.book.imageUrl, 100)} style={{ width: 34, height: 50, borderRadius: 6 }} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={{ width: 34, height: 50, borderRadius: 6, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}><SF name="book.fill" size={16} color={T.labelTertiary} /></View>}
            title={s.book.title} subtitle={`${tr('Читаю')} · ${s.progress}%`} chevron />
        ))}
        {readBooks.length > 0 ? (
          <ListRow leading={<IconCircle icon="checkmark.circle.fill" color="#fff" bg={T.green} size={30} />}
            title={tr('Прочитано')} detail={String(readBooks.length)} chevron onPress={openLibrary} />
        ) : null}
        <ListRow leading={<IconCircle icon="book.fill" color="#fff" bg={T.brand} size={30} />}
          title={tr('Библиотека книг')} chevron last onPress={openLibrary} />
      </ListSection>

      {/* Strengths snapshot */}
      {(profile?.gallup ?? []).length > 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 18, backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[ty.title3, { color: T.label, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('strengths')}</Text>
            {!live ? (
              <Pressable onPress={() => reload()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SF name="arrow.clockwise" size={12} color={T.labelSecondary} />
                <Text style={[ty.caption2Em, { color: T.labelSecondary }]} numberOfLines={1}>{t('demo_refresh')}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {profile!.gallup.slice(0, 10).map((g) => {
              const c = GALLUP_DOMAIN_META[g.domain]?.color ?? T.brand;
              return (
                <View key={g.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c + '18' }}>
                  <Text style={[ty.caption2Em, { color: c }]}>{g.rank}</Text>
                  <Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1}>{g.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Gardner — множественный интеллект */}
      {(profile?.gardner ?? []).length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 36, paddingTop: 8, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{tr('Множественный интеллект')}</Text>
          <View style={{ marginHorizontal: 16 }}>
            <GardnerChart data={profile!.gardner} compact />
          </View>
        </View>
      ) : null}

      {/* Account */}
      <ListSection header={t('account')} style={{ marginTop: 18 }}>
        <ListRow leading={<IconCircle icon="person.crop.circle.fill" color="#fff" bg={T.brand} size={30} />} title={email ?? t('signed_in')} subtitle="Divergents LMS · Talentslab" />
        {blocked.length > 0 ? (
          <ListRow leading={<IconCircle icon="hand.raised.fill" color="#fff" bg={T.labelSecondary} size={30} />} title="Заблокированные" detail={String(blocked.length)} chevron onPress={manageBlocked} />
        ) : null}
        <ListRow leading={<SF name="arrow.right" size={20} color={T.red} />} title={t('signout')} valueColor={T.red} last onPress={handleSignOut} />
      </ListSection>

      {coursesInProgress > 0 ? (
        <ListSection header={t('continue_')}>
          <ListRow leading={<IconCircle icon="book.fill" color="#fff" bg={T.brand} size={30} />} title={t('continue_learning')} subtitle={`${coursesInProgress} ${coursesInProgress === 1 ? t('in_progress_1') : t('in_progress_n')}`} chevron last onPress={goLearning} />
        </ListSection>
      ) : null}

      {/* Anketa — single entry that opens the full Talentslab report */}
      <ListSection header={tr('Анкета')} style={{ marginTop: 18 }}>
        <ListRow
          leading={<IconCircle icon="doc.text.fill" color="#fff" bg={T.brand} size={30} />}
          title={tr('Открыть свою анкету')}
          subtitle={tr('Полный отчёт: таланты, MBTI, Гарднер')}
          chevron last
          onPress={() => navigation.getParent()?.navigate('CareerTab', { screen: 'TalentProfile' } as never)}
        />
      </ListSection>

      {/* Reports */}
      {(profile?.reports ?? []).length > 0 ? (
        <ListSection header={t('reports')}>
          {profile!.reports.map((r, i) => (
            <ListRow key={i} onPress={() => Linking.openURL(encodeURI(r.url))} leading={<SF name="doc.fill" size={20} color={T.brand} />} title={r.title} trailing={<SF name="arrow.up.circle.fill" size={20} color={T.brand} />} last={i === profile!.reports.length - 1} />
          ))}
        </ListSection>
      ) : null}

      {challengeActive ? (
        <ListSection header={t('active_challenge')}>
          <Pressable onPress={goCareer} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{challenge.title}</Text>
            </View>
            <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>{challenge.currentDay}/{challenge.totalDays}</Text>
          </Pressable>
        </ListSection>
      ) : null}

      {myApps.length > 0 ? (
        <ListSection header={`${t('applications_n')} · ${myApps.length}`}>
          {myApps.map((j, i) => (
            <ListRow key={j.id} onPress={goCareer}
              leading={<View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
              title={j.title} subtitle={`${j.company} · ${j.city}`}
              trailing={<Capsule bg="rgba(52,199,89,0.15)" color={T.green}>{t('sent_')}</Capsule>} last={i === myApps.length - 1} />
          ))}
        </ListSection>
      ) : null}

      {/* Offline downloads — its own section */}
      <ListSection header={tr('Офлайн')}>
        <ListRow leading={<IconCircle icon="arrow.down.circle" color="#fff" bg={T.brand} size={30} />}
          title={tr('Загрузки')} subtitle={tr('Скачанные аудио-уроки и доступные к скачиванию')} chevron last onPress={() => navigation.navigate('Downloads')} />
      </ListSection>

      {/* Appearance */}
      <ListSection header={t('appearance')}>
        <ListRow leading={<IconCircle icon="paintpalette.fill" color="#fff" bg={T.brand} size={30} />}
          title={t('personalization')} subtitle={t('personalization_sub')} chevron last onPress={() => navigation.navigate('Personalize')} />
        {/* Язык РУС/ENG временно скрыт — английский перевод на паузе */}
      </ListSection>

      {/* Support — write to us on Telegram */}
      <ListSection header={tr('Поддержка')} footer={tr('Вопросы, ошибки или предложения — напишите нам в Telegram.')}>
        <ListRow leading={<IconCircle icon="paperplane.fill" color="#fff" bg={T.brand} size={30} />}
          title={tr('Написать в поддержку')} detail="@haaknazar" chevron last
          onPress={() => Linking.openURL('https://t.me/haaknazar').catch(() => {})} />
      </ListSection>

      <View style={{ height: 30 }} />
    </Screen>
  );
}
