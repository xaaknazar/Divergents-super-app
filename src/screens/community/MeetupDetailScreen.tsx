import { StatusBadge } from '../../components/StatusBadge';
import { Wrapper } from '../../components/Wrapper';
// Карточка мероприятия: встреча сообщества — лекция, мастер-класс, кинопоказ.
//
// Устроена как карточка поездки и по тем же правилам: заявка, решение
// организатора, разбор заявок для создателя. Полей меньше — нет региона, числа
// дней, сложности и маршрута, они про поход.
import React, { useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Share, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../state/LanguageContext';
import { SF } from '../../components/SFIcon';
import { NavHeader, NavRoundButton } from '../../components/NavHeader';
import { ListSection, ListRow, Button } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { fetchMeetupDetail, fetchSportDetail, Meetup, spotsLeft, UNLIMITED_SPOTS } from '../../data/community';
import { useEnrollment } from '../../state/EnrollmentContext';
import { cancelEventApplication, imgUrl, applyToMeetup, joinSport, joinFailureMessage } from '../../data/api';
import { useEventRefreshSignal } from '../../state/useEventRefreshSignal';
import { formatEventDateTime } from '../../data/offlineEventPolicy';
import { confirmEventApplication } from './eventApplicationConsent';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'MeetupDetail'>;

/** «12 июля · 19:00» — только из непустых кусков. */
function whenLabel(m: Meetup): string { return m.meetAt ? meetAtLabel(m.meetAt) : m.date; }
const meetAtLabel = formatEventDateTime;

export function MeetupDetailScreen({ route, navigation }: Props | NativeStackScreenProps<CommunityStackParams, 'SportDetail'>) {
  const kind = route.name === 'SportDetail' ? 'sport' : 'meetup';
  const eventId = route.params ? ('sportId' in route.params ? route.params.sportId : route.params.meetupId) : '';
  const fetchDetail = kind === 'sport' ? fetchSportDetail : fetchMeetupDetail;
  const applyToEvent = kind === 'sport' ? joinSport : applyToMeetup;
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const refreshSignal = useEventRefreshSignal();
  const { has, toggle, add, remove } = useEnrollment();

  const { getToken, isSignedIn, userId } = useAuth();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const applyLock = useRef(false);
  const [canManage, setCanManage] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  // Мероприятие прошло: карточка ещё открывается участнику и организатору, но
  // записаться уже нельзя.
  const [past, setPast] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      let token: string | null = null;
      try { token = isSignedIn ? await getToken() : null; } catch { token = null; }
      const d = await fetchDetail(eventId, token);
      if (!alive) return;
      setMeetup(d?.meetup ?? null);
      setCanManage(d?.canManage ?? false);
      setIsCreator(d?.isCreator ?? false);
      setPendingCount(d?.pendingCount ?? 0);
      setPast(d?.past ?? false);
      setClosed(d?.closed ?? false);
      setServerStatus(d?.myStatus ?? null);
      if (d) {
        if (d.myStatus === 'approved' || d.myStatus === 'going' || d.myStatus === 'pending') add(`${kind}:${d.meetup.id}`, d.myStatus === 'pending' ? 'pending' : 'approved');
        else remove(`${kind}:${d.meetup.id}`);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
    // Перезагружаем при каждом возврате: организатор уходит разбирать заявки и
    // должен вернуться к свежим счётчикам.
  }, [eventId, kind, isSignedIn, userId, refreshSignal]));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg }}>
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      </View>
    );
  }

  if (!meetup) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="calendar"
          title={tr('Встреча не найдена')}
          subtitle={tr('Возможно, оно уже прошло или было снято с публикации.')}
          actionLabel={tr('Назад')}
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const fav = has(`meetupfav:${meetup.id}`);
  const status = serverStatus;
  const joined = status === 'approved' || status === 'going';
  const pending = status === 'pending';
  const goingCount = meetup.going;
  const left = spotsLeft(meetup.spots, goingCount);
  const when = whenLabel(meetup);
  const hasCoords = meetup.meetLat != null && meetup.meetLng != null;

  const stats = [
    { v: String(goingCount), l: tr('Идут') },
    left === null
      ? { v: '∞', l: `${tr('Мест')} ${tr(UNLIMITED_SPOTS)}` }
      : { v: String(left), l: tr('Свободных мест') },
    { v: meetup.price, l: tr('Стоимость') },
  ];

  const openOnMap = () => {
    if (!hasCoords) return;
    const q = `${meetup.meetLat},${meetup.meetLng}`;
    const label = encodeURIComponent(meetup.place || meetup.title);
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${q}&q=${label}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => {});
  };

  const cancelApplication = () => Alert.alert('Отменить участие?', 'Организатор увидит, что вы сняли заявку.', [
    { text: 'Оставить', style: 'cancel' },
    { text: 'Отменить заявку', style: 'destructive', onPress: async () => {
      if (applyLock.current) return;
      applyLock.current = true; setJoining(true);
      try {
        const token = await getToken();
        const res = await cancelEventApplication(kind, token, meetup.id);
        if (!res.ok) { Alert.alert('Не удалось отменить', 'Проверьте подключение и обновите карточку.'); return; }
        setServerStatus('cancelled'); remove(`${kind}:${meetup.id}`);
        const detail = await fetchDetail(meetup.id, token);
        if (detail) setMeetup(detail.meetup);
      } catch { Alert.alert('Нет связи', 'Попробуйте снова.'); }
      finally { applyLock.current = false; setJoining(false); }
    } },
  ]);

  const apply = async () => {
    if (isCreator || joined || pending || applyLock.current || past || closed || left === 0) return;
    if (!isSignedIn) { Alert.alert('Войдите в аккаунт', 'Для подачи заявки нужна авторизация.'); return; }
    applyLock.current = true;
    try {
      if (!(await confirmEventApplication())) return;
      setJoining(true);
      const token = await getToken();
      const res = await applyToEvent(token, meetup.id);
      if (res.ok) {
        const next = res.reason === 'approved' || res.reason === 'going' ? 'approved' : 'pending';
        setServerStatus(next);
        add(`${kind}:${meetup.id}`, next);
        Alert.alert(next === 'approved' ? 'Вы уже в списке участников' : 'Заявка отправлена', 'Статус заявки и решение организатора появятся в приложении.');
      } else {
        const m = joinFailureMessage(res);
        Alert.alert(tr(m.title), tr(m.body));
      }
    } catch {
      Alert.alert(tr('Нет связи'), tr('Проверьте подключение и попробуйте снова.'));
    } finally {
      applyLock.current = false;
      setJoining(false);
    }
  };

  const buttonLabel = isCreator ? 'Вы организатор'
    : past ? 'Встреча завершена'
    : joined ? 'Вы идёте ✓'
    : pending ? 'Заявка на рассмотрении'
    : closed ? 'Набор закрыт'
    : left === 0 ? 'Мест нет'
    : status === 'rejected' ? 'Подать заявку повторно'
    : 'Записаться · Бесплатно';

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}>
        {/* Обложка */}
        <View style={{ height: 240, backgroundColor: '#8AA3BD' }}>
          {meetup.imageUrl ? (
            <>
              <Image source={imgUrl(meetup.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 240 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
              <View style={{ position: 'absolute', width: '100%', height: 240, backgroundColor: 'rgba(0,0,0,0.28)' }} />
            </>
          ) : (
            <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="none" style={{ position: 'absolute' }}>
              <Polygon points="0,170 90,110 160,150 240,90 310,140 400,100 400,240 0,240" fill="rgba(255,255,255,0.18)" />
              <Polygon points="0,200 70,150 150,180 220,130 300,170 360,145 400,180 400,240 0,240" fill="rgba(255,255,255,0.3)" />
            </Svg>
          )}
          <NavHeader variant="overlay" overlayScheme="light" backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} trailing={<>
              <NavRoundButton icon={fav ? 'heart.fill' : 'heart'} scheme="light" accessibilityLabel={tr('В избранное')} onPress={() => toggle(`meetupfav:${meetup.id}`)} />
              <NavRoundButton icon="square.and.arrow.up" scheme="light" accessibilityLabel={tr('Поделиться')} onPress={() => Share.share({ message: [`${meetup.title} — мероприятие Divergents`, meetup.place, when].filter(Boolean).join(' · ') })} />
            </>} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            {when ? <StatusBadge label={String((when))} tone="neutral" variant="surface" icon="calendar" /> : null}
            <Text
              style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >{meetup.title}</Text>
            {meetup.place ? (
              <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]} numberOfLines={1}>{meetup.place}</Text>
            ) : null}
          </View>
        </View>

        {/* Сводка */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0, paddingHorizontal: 6, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              {/* Длинная цена («Каждый платит за себя») в треть ширины не влезает
                  одной строкой — показываем помельче и в две. */}
              <Text
                style={[s.v.length > 6 ? ty.footnoteEm : ty.headline, { color: T.label, textAlign: 'center' }]}
                numberOfLines={2}
              >{s.v}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={2}>{s.l}</Text>
            </View>
          ))}
        </View>

        {meetup.description ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('О мероприятии')}>
            <View style={{ padding: 14 }}>
              <Text style={[ty.body, { color: T.label }]}>{meetup.description}</Text>
            </View>
          </ListSection></Wrapper>
        ) : null}

        {(meetup.place || meetup.meetAt || hasCoords) ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Где и когда')}>
            {meetup.place ? (
              <ListRow leading={<SF name="mappin.and.ellipse" size={18} color={T.brand} />} title={meetup.place} />
            ) : null}
            {meetup.meetAt ? (
              <ListRow leading={<SF name="clock.fill" size={18} color={T.brand} />} title={meetAtLabel(meetup.meetAt)} subtitle={tr('Начало')} />
            ) : null}
            {hasCoords ? (
              <ListRow
                leading={<SF name="map.fill" size={18} color={T.brand} />}
                title={tr('Открыть точку на карте')}
                subtitle={`${meetup.meetLat!.toFixed(5)}, ${meetup.meetLng!.toFixed(5)}`}
                chevron onPress={openOnMap} />
            ) : null}
          </ListSection></Wrapper>
        ) : null}

        {meetup.city ? <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Город"><ListRow title={meetup.city} /></ListSection></Wrapper> : null}
        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Организатор')}>
          <ListRow
            leading={<View style={{ width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: '#fff' }]}>{meetup.organizer.charAt(0)}</Text></View>}
            title={meetup.organizer} subtitle="Divergents" />
        </ListSection></Wrapper>

        {canManage ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Организатору')}>
            <ListRow
              leading={<SF name="person.2.fill" size={18} color={T.brand} />}
              title={tr('Заявки')}
              subtitle={pendingCount > 0 ? `${pl.applications(pendingCount)} ждут решения` : tr('Все заявки рассмотрены')}
              trailing={pendingCount > 0
                ? <StatusBadge label={String((String(pendingCount)))} tone="warning" />
                : undefined}
              chevron
              onPress={() => navigation.navigate('EventApplicants', { kind, eventId: meetup.id, title: meetup.title })}
            />
          </ListSection></Wrapper>
        ) : null}

        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={`${tr('Идут')} · ${pl.people(goingCount)}`}>
          {goingCount === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Пока никто не записался — будьте первым.')}</Text>
            </View>
          ) : (
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: Math.min(goingCount, 9) }).map((_, i) => (
                <View key={i} style={{ width: 36, height: 36, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="person.fill" size={18} color={T.brand} />
                </View>
              ))}
              {goingCount > 9 ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>+{goingCount - 9}</Text>
                </View>
              ) : null}
            </View>
          )}
        </ListSection></Wrapper>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        {past ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]}>
            {tr('Это мероприятие уже состоялось. Из ленты оно ушло, запись закрыта.')}
          </Text>
        ) : pending ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]}>
            {tr('Организатор рассмотрит заявку и подтвердит участие.')}
          </Text>
        ) : left === 0 && !joined ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]}>
            {tr('Все места заняты. Новые заявки пока не принимаются.')}
          </Text>
        ) : null}
        <Button label={buttonLabel} icon={past ? 'checkmark.circle' : joined ? 'checkmark' : pending ? 'clock.fill' : 'paperplane.fill'} loading={joining} disabled={isCreator || past || closed || joined || pending || left === 0} onPress={apply} tone={past ? 'neutral' : joined ? 'success' : pending ? 'warning' : 'brand'} />
        {(joined || pending) && !past ? <Pressable accessibilityRole="button" accessibilityLabel="Отменить заявку" disabled={joining} onPress={cancelApplication} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={[ty.subhead, { color: T.redText }]}>Отменить заявку</Text></Pressable> : null}
        {status === 'rejected' ? <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginTop: 8 }]}>Организатор отклонил вашу заявку.</Text> : null}
      </View>
    </View>
  );
}

export const SportDetailScreen = MeetupDetailScreen;
