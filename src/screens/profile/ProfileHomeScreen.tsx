import { useAuth,useClerk,useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useState } from 'react';
import { Alert,Linking,Pressable,ScrollView,Text,View } from 'react-native';
import { AchievementMedal } from '../../components/AchievementMedal';
import { ActionBlock } from '../../components/ActionBlock';
import { ContentBlock } from '../../components/ContentBlock';
import { GardnerChart } from '../../components/GardnerChart';
import { IconTile } from '../../components/IconTile';
import { IconBadge } from '../../components/IconBadge';
import { Logo } from '../../components/Logo';
import { PageIntro } from '../../components/PageIntro';
import { ProfileSummary } from '../../components/ProfileSummary';
import { SF } from '../../components/SFIcon';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Wrapper } from '../../components/Wrapper';
import { HeaderIcon,NavBarLarge } from '../../components/headers';
import { ListRow,ListSection } from '../../components/ui';
import { useAchievements } from '../../data/achievements';
import { BookThumb } from '../../components/BookThumb';
import { useMyBooks } from '../../state/useMyBooks';
import { fetchCommunityHome,fetchMyChallengeHistory,SportActivity,Trip } from '../../data/community';
import { applyGallupOrder,effectiveResumeCompleteness,fmtList,GALLUP_DOMAIN_META,gallupEnglishName,loadGallupOrder,mbtiName } from '../../data/talentslab';
import { ProfileStackParams } from '../../navigation/types';
import { formatPace,paceTimeSec } from '../../state/ActivityContext';
import { useCareer } from '../../state/CareerContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useCourses } from '../../state/CourseContext';
import { useCoursePurchases } from '../../state/CoursePurchasesContext';
import { CoursePurchaseSettings } from '../../components/CoursePurchaseSettings';
import { useEnrollment } from '../../state/EnrollmentContext';
import { useFitness } from '../../state/FitnessContext';
import { tr,useLang } from '../../state/LanguageContext';
import { useModeration } from '../../state/ModerationContext';
import { useNotifications } from '../../state/NotificationsContext';
import { deleteAccountAndClear,signOutAndClear } from '../../state/signOut';
import { useResume } from '../../state/useResume';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParams, 'ProfileHome'>;

export function ProfileHomeScreen({ navigation }: Props) {
  const { T, mode, setMode, ty } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();
  const { challenge, isParticipant } = useChallenge();
  const { records, goals: fitnessGoals } = useFitness();
  const { has, statusOf } = useEnrollment();
  const { courses, progress, reload: reloadCourses } = useCourses();
  const purchases = useCoursePurchases();
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
  // «Мои книги»: библиотека и книги Reading-челленджей, обновляются по shelfBus сразу после отметок.
  const myBooks = useMyBooks();
  const [communityActivities, setCommunityActivities] = useState<{ trips: Trip[]; sport: SportActivity[] }>({ trips: [], sport: [] });
  // Сколько всего челленджей у человека и есть ли награда 🏆. Плитка
  // «Челленджи» показывает число, а не текущий день: челлендж кончился, а
  // раздел остался — в нём история.
  const [challengeStats, setChallengeStats] = useState<{ count: number; award: boolean }>({ count: 0, award: false });
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

  // История челленджей — для числа на плитке и значка награды.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) { setChallengeStats({ count: 0, award: false }); return; }
      try {
        const token = await getToken();
        const list = await fetchMyChallengeHistory(token);
        if (!alive) return;
        setChallengeStats({
          count: list.length,
          award: list.some((h) => h.result?.award === true),
        });
      } catch {
        // Не загрузилось — плитка покажет прочерк, как и раньше.
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  const reading = myBooks.items.filter((s) => s.status === 'reading');
  const readBooks = myBooks.items.filter((s) => s.status === 'read');
  const openMyBooks = () => navigation.navigate('MyBooks');
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
    // Раньше здесь был номер текущего дня — он был пуст у всех, кто не в
    // идущем челлендже, и обнулялся после финиша. Теперь плитка про раздел:
    // сколько челленджей за человеком, включая прошедшие.
    { v: challengeStats.count > 0 ? String(challengeStats.count) : (challengeActive ? '1' : '—'), l: tr('Челленджи'), icon: 'flame.fill', c: T.red, onPress: () => navigation.navigate('ChallengeHistory') },
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
    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={header}>
      {data.map(([l, v], i) => (
        <ListRow key={l} title={l} detail={v.length > 24 ? undefined : v} subtitle={v.length > 24 ? v : undefined} />
      ))}
    </ListSection></Wrapper>
  );

  return (
    <Screen largeTitle="Профиль" backdrop="profile" onRefresh={async () => { reloadCourses(); await Promise.all([reload(), loadCommunityActivities(), myBooks.reload()]); }}>
      <PageIntro page="profile" />
      <NavBarLarge title={t('profile')} trailing={(
        <HeaderIcon name="bell.fill" badge={unread} label="Уведомления" onPress={() => navigation.getParent()?.getParent()?.navigate('Notifications' as never)} />
      )} />

      <Wrapper marginHorizontal={16} marginBottom={14}>
        <ProfileSummary name={name} email={email} photoUrl={photoUrl} completeness={completeness} award={!!challengeStats.award}
          talent={profile?.mbtiType ? `MBTI · ${profile.mbtiName || `${profile.mbtiType} ${mbtiName(profile.mbtiType)}`}` : undefined}
          onEdit={editAnketa} />
      </Wrapper>

      {/* Live challenge — top placement, right after the profile/anketa hero */}
      {challengeActive ? (
        <Wrapper marginTop={6} marginHorizontal={16} marginBottom={18}><ListSection header={t('active_challenge')} >
          <Pressable onPress={goChallenge} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={19} body={T.onBrand} head={T.onBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{challenge.title}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{tr('День')} {challenge.currentDay}/{challenge.totalDays}</Text>
            </View>
            <SF name="chevron.forward" size={14} color={T.labelTertiary} />
          </Pressable>
        </ListSection></Wrapper>
      ) : null}

      {(myTrips.length > 0 || mySport.length > 0) ? (
        <Wrapper marginTop={6} marginHorizontal={16} marginBottom={18}><ListSection header={tr('Мои активности')} >
          {myTrips.map((trip, index) => (
            <ListRow key={`trip:${trip.id}`} leading={<IconBadge icon="map.fill" />}
              title={trip.title} subtitle={`${statusOf(`trip:${trip.id}`) === 'pending' ? tr('Заявка на рассмотрении') : tr('Ваша поездка')}${trip.date ? ` · ${trip.date}` : ''}`}
              chevron onPress={() => goTrip(trip.id)} />
          ))}
          {mySport.map((activity, index) => (
            <ListRow key={`sport:${activity.id}`} leading={<IconBadge icon={activity.icon} tone="success" />}
              title={activity.title} subtitle={`${tr('Вы записаны')}${activity.date ? ` · ${activity.date}` : ''}`}
              chevron onPress={goSport} />
          ))}
        </ListSection></Wrapper>
      ) : null}

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 18 }}>
        {tiles.map((t, i) => (
          <Wrapper flex={1} key={i}><ActionBlock size="compact" onPress={t.onPress} accessibilityRole="button" accessibilityLabel={tileA11y(t.l, t.v)}>
            <SF name={t.icon} size={18} color={t.c} />
            <Text style={[ty.title2, { color: T.label, marginTop: 8 }]} numberOfLines={1}>{t.v}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={2}>{t.l}</Text>
          </ActionBlock></Wrapper>
        ))}
      </View>

      {/* Achievements */}
      <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={`${t('achievements_n')} · ${ach.earned}/${ach.total}`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          {[...ach.badges].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress).slice(0, 4).map((b) => (
            <Pressable key={b.id} accessibilityRole="button" onPress={() => navigation.navigate('Achievements')}
              accessibilityLabel={`${b.title} — ${b.earned ? tr('получено') : tr('заблокировано')}. Открыть достижения`}
              style={({ pressed }) => ({ width: 104, minHeight: 48, alignItems: 'center', gap: 8, paddingVertical: 8, opacity: pressed ? 0.65 : 1 })}>
              <AchievementMedal b={b} size="regular" />
              <Text style={[ty.caption1, { color: T.label, textAlign: 'center' }]}>{b.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ListRow title={t('view_all_ach')}  chevron onPress={() => navigation.navigate('Achievements')} />
      </ListSection></Wrapper>

      {/* My books — reading now / read, with a link into the Library */}
      <Wrapper marginTop={18} marginHorizontal={16}><ListSection header={tr('Мои книги')} >
        {reading.slice(0, 2).map((s) => (
          <ListRow key={s.id} onPress={() => s.libraryBookId ? openBook(s.libraryBookId) : openMyBooks()}
            leading={<BookThumb uri={s.cover} />} title={s.title} subtitle={s.detail} chevron />
        ))}
        {readBooks.length > 0 ? (
          <ListRow leading={<IconBadge icon="checkmark.circle.fill" tone="success" />}
            title={tr('Прочитано')} detail={String(readBooks.length)} chevron onPress={openMyBooks} />
        ) : null}
        {myBooks.items.length > 0 ? <ListRow leading={<IconBadge icon="books.vertical.fill" />}
          title={tr('Все мои книги')} detail={String(myBooks.items.length)} chevron onPress={openMyBooks} /> : null}
        <ListRow leading={<IconBadge icon="book.fill" />}
          title={tr('Библиотека книг')} chevron onPress={openLibrary} />
      </ListSection></Wrapper>

      {/* Strengths snapshot */}
      {(profile?.gallup ?? []).length > 0 ? (
        <Wrapper marginHorizontal={16} marginTop={18}><ContentBlock size="regular">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text accessibilityRole="header" style={[ty.title3, { color: T.label, flexShrink: 1 }]}>{t('strengths')}</Text>
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
                <View key={g.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderCurve: 'continuous', backgroundColor: c + '18' }}>
                  <Text style={[ty.caption2Em, { color: c }]}>{g.rank}</Text>
                  <Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1}>{gallupEnglishName(g.name)}</Text>
                </View>
              );
            })}
          </View>
        </ContentBlock></Wrapper>
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

      {/* Физические показатели: рекорды из тренировок, цели, свои показатели. */}
      <Wrapper marginTop={18} marginHorizontal={16}><ListSection header={tr('Физические показатели')} >
        <Pressable onPress={() => navigation.navigate('MyFitness')} accessibilityRole="button" accessibilityLabel={tr('Мои тренировки')}
          style={({ pressed }) => ({ padding: 14, gap: 12, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon="figure.run" tone="brand" size="sm" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{tr('Мои тренировки')}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                {records.runs + records.walks > 0
                  ? `${(records.totalM / 1000).toFixed(1).replace('.', ',')} км всего · ${(records.weekM / 1000).toFixed(1).replace('.', ',')} км за неделю`
                  : tr('Рекорды, цели и показатели')}
              </Text>
            </View>
            <SF name="chevron.right" size={13} color={T.labelTertiary} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { v: records.longestRun ? `${(records.longestRun.distanceM / 1000).toFixed(1).replace('.', ',')} км` : '—', l: tr('рекорд бега') },
              { v: records.fastestRun ? formatPace(records.fastestRun.distanceM, paceTimeSec(records.fastestRun)) : '—', l: tr('лучший темп') },
              { v: String(fitnessGoals.filter((g) => !g.doneISO).length), l: tr('целей') },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 8, alignItems: 'center' }}>
                <Text style={[ty.subheadEm, nums, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
                <Text style={[ty.caption2, { color: T.labelSecondary }]} numberOfLines={1}>{s.l}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => navigation.navigate('WorkoutTrack')} accessibilityRole="button" accessibilityLabel={tr('Записать тренировку')}
              style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
              <SF name="figure.run" size={15} color={T.onBrand} />
              <Text style={[ty.subheadEm, { color: T.onBrand }]}>{tr('Записать')}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('MyFitness')} accessibilityRole="button" accessibilityLabel={tr('Открыть мои тренировки')}
              style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brandTinted, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
              <SF name="arrow.right" size={15} color={T.brandText} />
              <Text style={[ty.subheadEm, { color: T.brandText }]}>{tr('Открыть')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </ListSection></Wrapper>

      {coursesInProgress > 0 ? (
        <Wrapper marginTop={18} marginHorizontal={16}><ListSection header={t('continue_')} >
          <ListRow leading={<IconBadge icon="book.fill" />} title={t('continue_learning')} subtitle={`${coursesInProgress} ${coursesInProgress === 1 ? t('in_progress_1') : t('in_progress_n')}`} chevron onPress={goLearning} />
        </ListSection></Wrapper>
      ) : null}

      {/* Anketa — single entry that opens the full Talentslab report */}
      <Wrapper marginTop={18} marginHorizontal={16}><ListSection header={tr('Анкета')} >
        <ListRow
          leading={<IconBadge icon="doc.text.fill" />}
          title={tr('Открыть свою анкету')}
          subtitle={tr('Полный отчёт: таланты, MBTI, Гарднер')}
          chevron
          onPress={() => navigation.navigate('TalentProfile', { origin: 'profile' })}
        />
      </ListSection></Wrapper>

      {/* Reports */}
      {(profile?.reports ?? []).length > 0 ? (
        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={t('reports')}>
          {profile!.reports.map((r, i) => (
            <ListRow key={i} onPress={() => Linking.openURL(encodeURI(r.url))} leading={<SF name="doc.fill" size={20} color={T.brand} />} title={r.title} trailing={<SF name="arrow.up.circle.fill" size={20} color={T.brand} />} />
          ))}
        </ListSection></Wrapper>
      ) : null}

      {myApps.length > 0 ? (
        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={`${t('applications_n')} · ${myApps.length}`}>
          {myApps.map((j, i) => (
            <ListRow key={j.id} onPress={goCareer}
              leading={<View style={{ width: 36, height: 36, borderRadius: 8, borderCurve: 'continuous', backgroundColor: T.fillQuaternary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.subheadEm, { color: j.color }]}>{j.logo}</Text></View>}
              title={j.title} subtitle={`${j.company} · ${j.city}`}
              trailing={<StatusBadge label={String((t('sent_')))} tone="success" />} />
          ))}
        </ListSection></Wrapper>
      ) : null}

      {/* Offline downloads — its own section */}
      <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Офлайн')}>
        <ListRow leading={<IconBadge icon="arrow.down.circle" />}
          title={tr('Загрузки')} subtitle={tr('Скачанные аудио-уроки и доступные к скачиванию')} chevron onPress={() => navigation.navigate('Downloads')} />
      </ListSection></Wrapper>

      {isSignedIn && purchases.available && purchases.catalog.accountToken ?
        <Wrapper marginTop={6} marginHorizontal={16}>
          <CoursePurchaseSettings phase={purchases.phase} message={purchases.message}
            onRestore={() => { void purchases.restore(); }} />
        </Wrapper> : null}

      {/* Appearance */}
      <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={t('appearance')}>
        <ListRow leading={<IconBadge icon="paintpalette.fill" />}
          title={t('personalization')} subtitle={t('personalization_sub')} chevron onPress={() => navigation.navigate('Personalize')} />
        {/* Язык РУС/ENG временно скрыт — английский перевод на паузе */}
      </ListSection></Wrapper>

      {/* Support — write to us on Telegram */}
      <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Поддержка')} footer={tr('Вопросы, ошибки или предложения — напишите нам в Telegram.')}>
        <ListRow leading={<IconBadge icon="paperplane.fill" />}
          title={tr('Написать в поддержку')} subtitle="@haaknazar" chevron
          onPress={() => Linking.openURL('https://t.me/haaknazar').catch(() => {})} />
      </ListSection></Wrapper>

      {/* Account — destructive actions live last (iOS Settings convention) */}
      <Wrapper marginTop={18} marginHorizontal={16}><ListSection header={t('account')} >
        <ListRow leading={<IconBadge icon="person.crop.circle.fill" />} title={email ?? t('signed_in')} subtitle="Divergents LMS · Talentslab" />
        {blocked.length > 0 ? (
          <ListRow leading={<IconBadge icon="hand.raised.fill" tone="neutral" />} title="Заблокированные" detail={String(blocked.length)} chevron onPress={manageBlocked} />
        ) : null}
        <ListRow leading={<SF name="arrow.right" size={20} color={T.red} />} title={t('signout')}  onPress={handleSignOut} />
        <ListRow leading={<SF name="trash.fill" size={20} color={T.red} />} title="Удалить аккаунт" subtitle="Без возможности восстановления" onPress={handleDeleteAccount} />
      </ListSection></Wrapper>

      <View style={{ height: 30 }} />
    </Screen>
  );
}
