import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useCallback,useEffect,useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { CommunityChallenges } from '../../components/CommunityChallenges';
import { CommunityChannels } from '../../components/CommunityChannels';
import { CommunityFeed } from '../../components/CommunityFeed';
import { CommunityMeetups } from '../../components/CommunityMeetups';
import { CommunitySport } from '../../components/CommunitySport';
import { CommunityTrips } from '../../components/CommunityTrips';
import { HeaderIcon,NavBarLarge } from '../../components/headers';
import { PageIntro } from '../../components/PageIntro';
import { ProfileAvatarButton } from '../../components/ProfileAvatarButton';
import { ResumeCallout } from '../../components/ResumeCallout';
import { Screen } from '../../components/Screen';
import { SectionTabs } from '../../components/SectionTabs';
import { Wrapper } from '../../components/Wrapper';
import {
ChallengeListItem,
fetchCommunityHome,
Meetup,
SportActivity,
Trip
} from '../../data/community';
import { hTap } from '../../lib/haptics';
import { CommunityStackParams } from '../../navigation/types';
import { useChannel } from '../../state/ChannelContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useEnrollment } from '../../state/EnrollmentContext';
import { tr,useLang } from '../../state/LanguageContext';
import { useNotifications } from '../../state/NotificationsContext';
import { useProfileButton } from '../../state/useProfileButton';
import { useRole } from '../../state/useRole';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>;
type Nav = Props['navigation'];

// Creator-only entry → the unified content-creation screen, which has its own
// challenge / trip / channel type selector.
function openCreateSheet(navigation: Nav) {
  hTap();
  navigation.navigate('CreateContent');
}

const SECTION_KEYS = ['sec_home', 'sec_channels', 'sec_challenges', 'sec_trips', 'sec_meetups', 'sec_sport'] as const;
// Разделы «Сообщества» можно выключать в админ-панели сайта. Лента и челленджи
// флага не имеют: без них вкладка теряет смысл.
//
// Индексы — позиции в SECTION_KEYS. При вставке нового раздела в СЕРЕДИНУ их
// нужно сдвигать здесь и в разборе `focus` ниже; поэтому мероприятия встали
// перед спортом, а не в конец: так порядок читается как «поездки, встречи,
// спорт», а не «поездки, спорт, и ещё встречи».
const SECTION_FEATURE: Record<number, string> = { 1: 'channels', 3: 'trips', 4: 'meetups', 5: 'sport' };

export function CommunityHomeScreen({ navigation, route }: Props) {
  const profileButton = useProfileButton();
  const { reduceMotion } = useTheme();
  const { t } = useLang();
  const { unread } = useNotifications();
  const { refresh: refreshEnrollments } = useEnrollment();
  const { refresh: refreshChallenges } = useChallenge();
  const { reload: reloadChannels } = useChannel();
  const { feature } = useRole();
  const { isSignedIn } = useAuth();
  const [seg, setSeg] = useState(0);
  const sectionOn = (i: number) => {
    const key = SECTION_FEATURE[i];
    return !key || feature(key);
  };
  // Раздел выключили, пока пользователь в нём стоял — возвращаем на ленту,
  // иначе экран остался бы пустым без единой кнопки.
  React.useEffect(() => { if (!sectionOn(seg)) setSeg(0); }, [seg, feature]);
  const refreshToken = route.params?.refresh;
  const focusParam = route.params?.focus;

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [sport, setSport] = useState<SportActivity[] | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListItem[] | null>(null);
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const d = await fetchCommunityHome();
    setTrips(d.trips);
    setSport(d.sport);
    setChallenges(d.challenges);
    setMeetups(d.meetups);
    setError(d.error);
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshEnrollments();
    void refreshChallenges();
    let alive = true;
    (async () => {
      const d = await fetchCommunityHome();
      if (!alive) return;
      setTrips(d.trips);
      setSport(d.sport);
      setChallenges(d.challenges);
      setMeetups(d.meetups);
      setError(d.error);
    })();
    return () => { alive = false; };
  }, [refreshEnrollments, refreshChallenges]));

  const onRefresh = useCallback(async () => {
    reloadChannels();
    await Promise.all([load(), refreshEnrollments(), refreshChallenges()]);
  }, [load, reloadChannels, refreshEnrollments, refreshChallenges]);

  // A create modal sets route.params.refresh on dismissal — reload the lists
  // once so newly published content shows immediately.
  useEffect(() => {
    if (refreshToken === undefined) return;
    reloadChannels();
    load();
  }, [refreshToken, load, reloadChannels]);

  // Notifications and completed creation flows still open their dedicated
  // section, even though the feed now also shows active and open challenges.
  useEffect(() => {
    if (!focusParam) return;
    const idx = focusParam === 'channel' ? 1
      : focusParam === 'challenge' ? 2
      : focusParam === 'trip' ? 3
      : focusParam === 'meetup' ? 4
      : 5;
    if (!sectionOn(idx)) return;
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSeg(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusParam, refreshToken, feature]);

  return (
    <Screen largeTitle={tr('Сообщество')} backdrop="community" onRefresh={onRefresh}>
      <PageIntro page="community" />
      <NavBarLarge title={t('community')} subtitle={t('community_tagline')} trailing={(
        <>
          {isSignedIn ? <HeaderIcon name="plus" label="Создать" onPress={() => openCreateSheet(navigation)} /> : null}
          <ProfileAvatarButton {...profileButton} onPress={() => navigation.getParent()?.navigate('ProfileTab' as never)} />
        </>
      )} />

      {/* Макет: строка разделов pad-top 8, первый раздел ленты — через 20. */}
      <Wrapper paddingHorizontal={16} paddingTop={8} paddingBottom={20} gap={14}>
        {seg === 2 ? <ResumeCallout area="community" /> : null}
        <SectionTabs items={SECTION_KEYS.map((k, id) => ({ id, label: t(k) })).filter(item => sectionOn(item.id))}
          value={seg} onChange={id => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSeg(id); }} />
      </Wrapper>

      {seg === 0 && <CommunityFeed navigation={navigation} setSeg={setSeg} trips={trips} sport={sport} challenges={challenges} error={error} onRetry={onRefresh} />}
      {seg === 1 && sectionOn(1) && <CommunityChannels navigation={navigation} />}
      {seg === 2 && <CommunityChallenges navigation={navigation} challenges={challenges} error={error} onRetry={onRefresh} />}
      {seg === 3 && sectionOn(3) && <CommunityTrips navigation={navigation} trips={trips} error={error} onRetry={load} />}
      {seg === 4 && sectionOn(4) && <CommunityMeetups navigation={navigation} meetups={meetups} error={error} onRetry={load} />}
      {seg === 5 && sectionOn(5) && <CommunitySport navigation={navigation} sport={sport} error={error} onRetry={load} />}
      <Wrapper paddingTop={16} />
    </Screen>
  );
}
