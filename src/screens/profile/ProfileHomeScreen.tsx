import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, ScrollView, Linking, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Logo } from '../../components/Logo';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { PageIntro } from '../../components/PageIntro';
import { NavBarLarge, HeaderIcon } from '../../components/headers';
import { useNotifications } from '../../state/NotificationsContext';
import { SF } from '../../components/SFIcon';
import { Capsule, IconCircle, ListSection, ListRow, Segmented } from '../../components/ui';
import { Ring } from '../../components/talentUI';
import { GardnerChart } from '../../components/GardnerChart';
import { fetchMyShelf, ShelfEntry } from '../../data/books';
import { onShelfChanged } from '../../state/shelfBus';
import { imgUrl } from '../../data/api';
import { useChallenge } from '../../state/ChallengeContext';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useCourses } from '../../state/CourseContext';
import { useCareer } from '../../state/CareerContext';
import { useResume } from '../../state/useResume';
import { useModeration } from '../../state/ModerationContext';
import { useLang, tr } from '../../state/LanguageContext';
import { useTalentProfile } from '../../state/useTalentProfile';
import { deleteAccountAndClear, signOutAndClear } from '../../state/signOut';
import { useAchievements } from '../../data/achievements';
import { GALLUP_DOMAIN_META, mbtiName, fmtList, effectiveResumeCompleteness, applyGallupOrder, loadGallupOrder } from '../../data/talentslab';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import { ProfileStackParams } from '../../navigation/types';
import { fetchCommunityHome, SportActivity, Trip } from '../../data/community';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: Props) {
  const { T, mode, setMode, ty } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();
  const { challenge, isParticipant } = useChallenge();
  const { has, statusOf } = useEnrollment();
  const { courses, progress, reload: reloadCourses } = useCourses();
  const { applied, jobs } = useCareer();
  const { completeness: localCompleteness, answers } = useResume();
  const { profile, live, reload } = useTalentProfile();
  const completeness = effectiveResumeCompleteness(profile, localCompleteness);
  const ach = useAchievements();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { blocked, unblock } = useModeration();
  const [accountAction, setAccountAction] = useState(false);

  // Personal reading shelf (books read / currently reading), cache-first so it
  // shows instantly; tapping opens the book or the Library in the Обучение tab.
  // Порядок талантов пользователь настраивает в «Профиле талантов»; читаем его
  // при каждом возврате на экран, иначе здесь оставался серверный порядок.
  const [gallupOrder, setGallupOrder] = React.useState<string[]>([]);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [communityActivities, setCommunityActivities] = useState<{ trips: Trip[]; sport: SportActivity[] }>({ trips: [], sport: [] });
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const loadShelf = useCallback(async () => {
    if (!isSignedIn) { setShelf([]); return; }
    try { const tok = await getTokenRef.current(); setShelf(await fetchMyShelf(tok)); } catch {}
  }, [isSignedIn]);
  useEffect(() => { loadShelf(); }, [loadShelf]);
  // Полку могли изменить на экране книги — обновляем «Мои книги» сразу, без
  // перезапуска приложения (см. shelfBus). Ссылка на актуальный загрузчик,
  // чтобы подписка оформлялась один раз.
  const loadShelfRef = useRef(loadShelf);
  loadShelfRef.current = loadShelf;
  useEffect(() => onShelfChanged(() => { loadShelfRef.current(); }), []);
  // Re-read the anketa/profile whenever the screen comes back into focus, so
  // edits made in the form show up immediately (silent = no full-screen spinner).
  useFocusEffect(React.useCallback(() => {
    reload(true);
    loadGallupOrder().then(setGallupOrder);
  }, [reload]));

  const loadCommunityActivities = async () => {
    const data = await fetchCommunityHome();
    setCommunityActivities({ trips: data.trips, sport: data.sport });
  };
  useEffect(() => { if (isSignedIn) loadCommunityActivities(); }, [isSignedIn]);
  const reading = shelf.filter((s) => s.status === 'reading');
  const readBooks = shelf.filter((s) => s.status === 'read');
  const openBook = (id: string) => navigation.getParent()?.navigate('LMSTab', { screen: 'BookDetail', params: { bookId: id }, initial: false } as never);
  const openLibrary = () => navigation.getParent()?.navigate('LMSTab', { screen: 'Books', initial: false } as never);

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
  // Open the live challenge tracker in the Community tab (was wrongly going to Career).
  const goChallenge = () => navigation.getParent()?.navigate('CommunityTab', { screen: 'ChallengeDetail', params: { challengeId: challenge.id }, initial: false } as never);
  const goTrip = (tripId: string) => navigation.getParent()?.navigate('CommunityTab', { screen: 'TripDetail', params: { tripId }, initial: false } as never);
  const goSport = () => navigation.getParent()?.navigate('CommunityTab', { screen: 'CommunityHome', params: { focus: 'sport' } } as never);

  const handleSignOut = () => {
    if (accountAction) return;
    Alert.alert(
      'Выйти из аккаунта?',
      undefined,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            setAccountAction(true);
            try {
              await signOutAndClear({ getToken, signOut });
            } catch {
              Alert.alert('Не удалось выйти', 'Проверьте подключение и попробуйте снова.');
            } finally {
              setAccountAction(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (accountAction) return;
    Alert.alert(
      'Удалить аккаунт навсегда?',
      'Профиль Clerk будет удалён без возможности восстановления. Локальная анкета, прогресс, GPS-маршруты, история AI и скачанные уроки также будут удалены с этого устройства.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить аккаунт',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Не удалось удалить аккаунт', 'Профиль ещё не загрузился. Попробуйте снова через несколько секунд.');
              return;
            }
            setAccountAction(true);
            try {
              await deleteAccountAndClear({
                getToken,
                signOut,
                deleteRemoteAccount: () => user.delete(),
              });
            } catch (error: any) {
              const clerkMessage = error?.errors?.[0]?.message;
              Alert.alert(
                'Не удалось удалить аккаунт',
                typeof clerkMessage === 'string' ? clerkMessage : 'Проверьте подключение и попробуйте снова. Аккаунт не был удалён.',
              );
            } finally {
              setAccountAction(false);
            }
          },
        },
      ],
    );
  };

  const coursesInProgress = courses.filter((c) => progress(c.id) > 0).length;
  const email = user?.primaryEmailAddress?.emailAddress;
  // The public identity is the псевдоним (short, never truncates). Fall back to
  // a real name only for legacy profiles that haven't set one yet.
  const nickname = typeof answers.nickname === 'string' && answers.nickname.trim()
    ? answers.nickname.trim()
    : (typeof (profile?.resume as { nickname?: unknown } | null)?.nickname === 'string'
        ? String((profile!.resume as { nickname?: unknown }).nickname).trim()
        : '');
  const name = nickname
    || user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || (profile?.fullName ? profile.fullName : null)
    || (email ? email.split('@')[0] : 'Divergents');
  const initial = (name?.trim()?.[0] ?? 'D').toUpperCase();
  // Photo: Talentslab anketa photo → Clerk avatar (Google/Apple sign-in) → initial.
  const photoUrl = profile?.photoUrl || user?.imageUrl || null;
  const challengeActive = isParticipant;
  const myTrips = communityActivities.trips.filter((trip) => has(`trip:${trip.id}`));
  const mySport = communityActivities.sport.filter((activity) => has(`sport:${activity.id}`));
  const myApps = jobs.filter((j) => applied.includes(j.id));
  const rz = profile?.resume ?? null;

  // Each tile opens the matching section: мои курсы, достижения, история челленджей.
  const tiles = [
    { v: String(coursesInProgress), l: tr('Курсов'), icon: 'book.fill', c: T.brand, onPress: goLearning },
    { v: `${ach.earned}`, l: tr('Достижений'), icon: 'rosette', c: T.orange, onPress: () => navigation.navigate('Achievements') },
    // "День челленджа" didn't fit the narrow tile — shortened to «День».
    { v: challengeActive ? String(challenge.currentDay) : '—', l: tr('День'), icon: 'flame.fill', c: T.red, onPress: () => navigation.navigate('ChallengeHistory') },
  ];
  // VoiceOver reads «—» as nothing useful — spell it out.
  const tileA11y = (l: string, v: string) => `${l}: ${v === '—' ? tr('нет данных') : v}`;

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
    <Screen largeTitle="Профиль" onRefresh={async () => { reloadCourses(); await Promise.all([reload(), loadCommunityActivities(), loadShelf()]); }}>
      <PageIntro page="profile" />
      <NavBarLarge title={t('profile')} trailing={(
        <HeaderIcon name="bell.fill" color={T.brand} badge={unread} label="Уведомления" onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />
      )} />

      {/* Gradient hero card — tap to edit the anketa (single edit entry) */}
      <Pressable onPress={editAnketa} accessibilityRole="button" accessibilityLabel="Редактировать анкету"
        style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: 'hidden', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          {/* Legibility scrim (same as PersonalizeScreen): white copy must stay
              readable when the user's accent is a pastel, esp. in dark theme. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.06)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={{ width: 64, height: 64, borderRadius: 18 }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.title1, { color: T.onBrand }]}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[ty.title2, { color: T.onBrand }]} numberOfLines={1}>{name}</Text>
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]} numberOfLines={1}>
                {email ?? 'Divergents'}
              </Text>
              {profile?.mbtiType ? (
                <View style={{ marginTop: 8 }}>
                  <Capsule bg="rgba(255,255,255,0.2)" color={T.onBrand}><SF name="sparkles" size={11} color={T.onBrand} />MBTI · {profile.mbtiName || `${profile.mbtiType} ${mbtiName(profile.mbtiType)}`}</Capsule>
                </View>
              ) : null}
            </View>
            <Ring value={completeness / 100} size={62} color={T.onBrand} label={`${completeness}%`} sub={t('questionnaire')} textColor={T.onBrand} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.22)' }}>
            <Text style={[ty.footnoteEm, { color: T.onBrand }]}>Редактировать анкету</Text>
            <SF name="chevron.right" size={12} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Live challenge — top placement, right after the profile/anketa hero */}
      {challengeActive ? (
        <ListSection header={t('active_challenge')} style={{ marginBottom: 18 }}>
          <Pressable onPress={goChallenge} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={19} body={T.onBrand} head={T.onBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{challenge.title}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{tr('День')} {challenge.currentDay}/{challenge.totalDays}</Text>
            </View>
            <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          </Pressable>
        </ListSection>
      ) : null}

      {(myTrips.length > 0 || mySport.length > 0) ? (
        <ListSection header={tr('Мои активности')} style={{ marginBottom: 18 }}>
          {myTrips.map((trip, index) => (
            <ListRow key={`trip:${trip.id}`} leading={<IconCircle icon="map.fill" color={T.onBrand} bg={T.brand} size={30} />}
              title={trip.title} subtitle={`${statusOf(`trip:${trip.id}`) === 'pending' ? tr('Заявка на рассмотрении') : tr('Ваша поездка')}${trip.date ? ` · ${trip.date}` : ''}`}
              chevron onPress={() => goTrip(trip.id)} last={index === myTrips.length - 1 && mySport.length === 0} />
          ))}
          {mySport.map((activity, index) => (
            <ListRow key={`sport:${activity.id}`} leading={<IconCircle icon={activity.icon} color="#fff" bg={T.green} size={30} />}
              title={activity.title} subtitle={`${tr('Вы записаны')}${activity.date ? ` · ${activity.date}` : ''}`}
              chevron onPress={goSport} last={index === mySport.length - 1} />
          ))}
        </ListSection>
      ) : null}

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
        {tiles.map((t, i) => (
          <Pressable key={i} onPress={t.onPress} accessibilityRole="button" accessibilityLabel={tileA11y(t.l, t.v)}
            style={({ pressed }) => ({ flex: 1, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.7 : 1 })}>
            <SF name={t.icon} size={18} color={t.c} />
            <Text style={[ty.title2, { color: T.label, marginTop: 8 }]} numberOfLines={1}>{t.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={2}>{t.l}</Text>
          </Pressable>
        ))}
      </View>

      {/* Achievements */}
      <ListSection header={`${t('achievements_n')} · ${ach.earned}/${ach.total}`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          {ach.badges.map((b) => (
            <View key={b.id} accessible accessibilityRole="image"
              accessibilityLabel={`${b.title} — ${b.earned ? tr('получено') : tr('заблокировано')}`}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: b.earned ? b.color : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
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
        <ListRow leading={<IconCircle icon="book.fill" color={T.onBrand} bg={T.brand} size={30} />}
          title={tr('Библиотека книг')} chevron last onPress={openLibrary} />
      </ListSection>

      {/* Strengths snapshot */}
      {(profile?.gallup ?? []).length > 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 18, backgroundColor: T.cardBg, borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[ty.title3, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{t('strengths')}</Text>
            {!live ? (
              <Pressable onPress={() => reload()} accessibilityRole="button" accessibilityLabel={t('demo_refresh')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 6 }}>
                <SF name="arrow.clockwise" size={12} color={T.labelSecondary} />
                <Text style={[ty.caption2Em, { color: T.labelSecondary }]} numberOfLines={1}>{t('demo_refresh')}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {applyGallupOrder(profile!.gallup, gallupOrder).slice(0, 10).map((g) => {
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

      {coursesInProgress > 0 ? (
        <ListSection header={t('continue_')} style={{ marginTop: 18 }}>
          <ListRow leading={<IconCircle icon="book.fill" color={T.onBrand} bg={T.brand} size={30} />} title={t('continue_learning')} subtitle={`${coursesInProgress} ${coursesInProgress === 1 ? t('in_progress_1') : t('in_progress_n')}`} chevron last onPress={goLearning} />
        </ListSection>
      ) : null}

      {/* Anketa — single entry that opens the full Talentslab report */}
      <ListSection header={tr('Анкета')} style={{ marginTop: 18 }}>
        <ListRow
          leading={<IconCircle icon="doc.text.fill" color={T.onBrand} bg={T.brand} size={30} />}
          title={tr('Открыть свою анкету')}
          subtitle={tr('Полный отчёт: таланты, MBTI, Гарднер')}
          chevron last
          onPress={() => navigation.navigate('TalentProfile', { origin: 'profile' })}
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
        <ListRow leading={<IconCircle icon="arrow.down.circle" color={T.onBrand} bg={T.brand} size={30} />}
          title={tr('Загрузки')} subtitle={tr('Скачанные аудио-уроки и доступные к скачиванию')} chevron last onPress={() => navigation.navigate('Downloads')} />
      </ListSection>

      {/* Appearance */}
      <ListSection header={t('appearance')}>
        <ListRow leading={<IconCircle icon="paintpalette.fill" color={T.onBrand} bg={T.brand} size={30} />}
          title={t('personalization')} subtitle={t('personalization_sub')} chevron last onPress={() => navigation.navigate('Personalize')} />
        {/* Язык РУС/ENG временно скрыт — английский перевод на паузе */}
      </ListSection>

      {/* Support — write to us on Telegram */}
      <ListSection header={tr('Поддержка')} footer={tr('Вопросы, ошибки или предложения — напишите нам в Telegram.')}>
        <ListRow leading={<IconCircle icon="paperplane.fill" color={T.onBrand} bg={T.brand} size={30} />}
          title={tr('Написать в поддержку')} subtitle="@haaknazar" chevron last
          onPress={() => Linking.openURL('https://t.me/haaknazar').catch(() => {})} />
      </ListSection>

      {/* Account — destructive actions live last (iOS Settings convention) */}
      <ListSection header={t('account')} style={{ marginTop: 18 }}>
        <ListRow leading={<IconCircle icon="person.crop.circle.fill" color={T.onBrand} bg={T.brand} size={30} />} title={email ?? t('signed_in')} subtitle="Divergents LMS · Talentslab" />
        {blocked.length > 0 ? (
          <ListRow leading={<IconCircle icon="hand.raised.fill" color="#fff" bg={T.labelSecondary} size={30} />} title="Заблокированные" detail={String(blocked.length)} chevron onPress={manageBlocked} />
        ) : null}
        <ListRow leading={<SF name="arrow.right" size={20} color={T.red} />} title={t('signout')} valueColor={T.redText} onPress={handleSignOut} />
        <ListRow leading={<SF name="trash.fill" size={20} color={T.red} />} title="Удалить аккаунт" subtitle="Без возможности восстановления" valueColor={T.redText} last onPress={handleDeleteAccount} />
      </ListSection>

      <View style={{ height: 30 }} />
    </Screen>
  );
}
