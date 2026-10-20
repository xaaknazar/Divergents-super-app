import { IconBadge } from '../../components/IconBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { Wrapper } from '../../components/Wrapper';
import React, { useCallback, useState, useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, Share, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { SF } from '../../components/SFIcon';
import { NavHeader, NavRoundButton } from '../../components/NavHeader';
import { ListSection, ListRow, Button } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { fetchTripDetail, Trip, spotsLeft, UNLIMITED_SPOTS } from '../../data/community';
import { useEnrollment } from '../../state/EnrollmentContext';
import { cancelEventApplication, imgUrl, applyToTrip, joinFailureMessage } from '../../data/api';
import { useAuth } from '@clerk/clerk-expo';
import { CommunityStackParams } from '../../navigation/types';
import { useEventRefreshSignal } from '../../state/useEventRefreshSignal';
import { formatEventDateTime } from '../../data/offlineEventPolicy';
import { confirmEventApplication } from './eventApplicationConsent';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'TripDetail'>;

// «12 авг · 3 дн.» — собираем только из непустых кусков, иначе в шапке
// появлялось голое «· 0 дн.» у поездки без даты и длительности.
function heroMeta(trip: Trip): string {
  return [trip.date, trip.days > 0 ? `${trip.days} дн.` : ''].filter(Boolean).join(' · ');
}
function heroSubtitle(trip: Trip): string {
  return [trip.region, trip.difficulty ? `сложность: ${trip.difficulty}` : ''].filter(Boolean).join(' · ');
}

// Время сбора приходит как «2026-07-12 09:00» или ISO — показываем как есть,
// заменяя только разделитель, чтобы не выдумывать формат за организатора.
const meetAtLabel = formatEventDateTime;

export function TripDetailScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const refreshSignal = useEventRefreshSignal();
  const { has, toggle, add, remove } = useEnrollment();

  const { getToken, isSignedIn, userId } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const applyLock = useRef(false);
  // Организатор поездки (или админ) видит кнопку «Заявки» со счётчиком новых.
  const [canManage, setCanManage] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  // Поездка прошла: карточка ещё открывается участнику и организатору (по
  // ссылке из уведомления), но записаться уже нельзя.
  const [past, setPast] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      // Токен нужен, чтобы участник видел и УЖЕ ЗАКРЫТУЮ поездку: публичный
      // список отдаёт только открытые.
      let token: string | null = null;
      try { token = isSignedIn ? await getToken() : null; } catch { token = null; }
      const d = await fetchTripDetail(route.params?.tripId ?? '', token);
      if (!alive) return;
      setTrip(d?.trip ?? null);
      setCanManage(d?.canManage ?? false);
      setIsCreator(d?.isCreator ?? false);
      setPendingCount(d?.pendingCount ?? 0);
      setPast(d?.past ?? false);
      setClosed(d?.closed ?? false);
      setServerStatus(d?.myStatus ?? null);
      if (d) {
        if (d.myStatus === 'approved' || d.myStatus === 'going' || d.myStatus === 'pending') add(`trip:${d.trip.id}`, d.myStatus === 'pending' ? 'pending' : 'approved');
        else remove(`trip:${d.trip.id}`);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
    // Перезагружаем на КАЖДЫЙ возврат на экран: организатор уходит разбирать
    // заявки и возвращается — счётчики «идут» и «ждут решения» должны быть
    // свежими, иначе он видит цифры до своих же решений.
  }, [route.params?.tripId, isSignedIn, userId, refreshSignal]));

  // ── Loading ──
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

  // ── Not found ──
  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="mappin.circle.fill"
          title={tr('Поездка не найдена')}
          subtitle={tr('Возможно, она завершилась или была снята с публикации.')}
          actionLabel={tr('Назад')}
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const fav = has(`tripfav:${trip.id}`);
  const status = serverStatus;
  const joined = status === 'approved' || status === 'going';
  const pending = status === 'pending';
  // trip.going — это _count.applications с сервера, и заявка пользователя в нём
  // УЖЕ учтена: прибавлять себя ещё раз значило считать себя дважды.
  const goingCount = trip.going;
  const left = spotsLeft(trip.spots, goingCount);
  const meta = heroMeta(trip);
  const subtitle = heroSubtitle(trip);
  const meetAt = trip.meetAt ? meetAtLabel(trip.meetAt) : '';
  const hasCoords = trip.meetLat != null && trip.meetLng != null;
  const stats = [
    { v: String(goingCount), l: tr('Идут') },
    // Показываем ОСТАТОК, а не вместимость: «Мест 20» при 20 занятых вводило в
    // заблуждение. spots === 0 — «без ограничения», а не «ноль мест».
    left === null
      ? { v: '∞', l: `${tr('Мест')} ${tr(UNLIMITED_SPOTS)}` }
      : { v: String(left), l: tr('Свободных мест') },
    { v: trip.price, l: tr('Стоимость') },
  ];

  const openMeetOnMap = () => {
    if (!hasCoords) return;
    const q = `${trip.meetLat},${trip.meetLng}`;
    const label = encodeURIComponent(trip.meetPlace || trip.title);
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
        const res = await cancelEventApplication('trip', token, trip.id);
        if (!res.ok) { Alert.alert('Не удалось отменить', 'Проверьте подключение и обновите карточку.'); return; }
        setServerStatus('cancelled'); remove(`${'trip'}:${trip.id}`);
        const detail = await fetchTripDetail(trip.id, token);
        if (detail) setTrip(detail.trip);
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
      const res = await applyToTrip(token, trip.id);
      if (res.ok) {
        const next = res.reason === 'approved' || res.reason === 'going' ? 'approved' : 'pending';
        setServerStatus(next);
        add(`trip:${trip.id}`, next);
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
    : joined ? 'Вы записаны ✓'
    : pending ? 'Заявка на рассмотрении'
    : closed ? 'Набор закрыт'
    : left === 0 ? 'Мест нет'
    : status === 'rejected' ? 'Подать заявку повторно'
    : 'Записаться · Бесплатно';

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}>
        {/* Hero */}
        <View style={{ height: 280, backgroundColor: '#8AA3BD' }}>
          {trip.imageUrl ? (
            <>
              <Image source={imgUrl(trip.imageUrl, 1080)} style={{ position: 'absolute', width: '100%', height: 280 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
              <View style={{ position: 'absolute', width: '100%', height: 280, backgroundColor: 'rgba(0,0,0,0.28)' }} />
            </>
          ) : (
            <Svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="none" style={{ position: 'absolute' }}>
              <Polygon points="0,200 80,120 140,180 220,80 290,160 360,110 400,180 400,280 0,280" fill="rgba(255,255,255,0.18)" />
              <Polygon points="0,230 60,170 130,210 200,140 280,200 340,170 400,210 400,280 0,280" fill="rgba(255,255,255,0.3)" />
            </Svg>
          )}
          <NavHeader variant="overlay" overlayScheme="light" backLabel={tr('Сообщество')} onBack={() => navigation.goBack()} trailing={<>
              <NavRoundButton icon={fav ? 'heart.fill' : 'heart'} scheme="light" accessibilityLabel={tr('В избранное')} onPress={() => toggle(`tripfav:${trip.id}`)} />
              <NavRoundButton icon="square.and.arrow.up" scheme="light" accessibilityLabel={tr('Поделиться')} onPress={() => Share.share({ message: [`${trip.title} — поездка Divergents`, trip.region, trip.date].filter(Boolean).join(' · ') })} />
            </>} />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            {meta ? <StatusBadge label={String((meta))} tone="neutral" variant="surface" icon="calendar" /> : null}
            {/* Две строки: названия поездок редко влезают в одну, и «Поездка
                выпить предрассветный кофе» обрывалась на «Поездка выпить пре…».
                adjustsFontSizeToFit ужимает шрифт, если и двух строк мало. */}
            <Text
              style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >{trip.title}</Text>
            {subtitle ? <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0, paddingHorizontal: 6, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              {/* Стоимость — свободный текст («Каждый платит за себя»), и в
                  треть ширины он не влезал: обрывалось «Каждый плати…». Длинные
                  значения показываем помельче и в две строки, короткие числа
                  («4», «0») остаются крупными. */}
              <Text
                style={[s.v.length > 6 ? ty.footnoteEm : ty.headline, { color: T.label, textAlign: 'center' }]}
                numberOfLines={2}
              >{s.v}</Text>
              {/* «Мест без ограничения» не влезает в одну строку у трети ширины. */}
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={2}>{s.l}</Text>
            </View>
          ))}
        </View>

        {trip.description ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('О поездке')}>
            <View style={{ padding: 14 }}>
              <Text style={[ty.body, { color: T.label }]}>{trip.description}</Text>
            </View>
          </ListSection></Wrapper>
        ) : null}

        {/* Место сбора: сервер его сохранял, но экран никогда не показывал. */}
        {(trip.meetPlace || meetAt || hasCoords) ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Место сбора')}>
            {trip.meetPlace ? (
              <ListRow leading={<SF name="mappin.and.ellipse" size={18} color={T.brand} />} title={trip.meetPlace} />
            ) : null}
            {meetAt ? (
              <ListRow leading={<SF name="clock.fill" size={18} color={T.brand} />} title={meetAt} subtitle={tr('Время сбора')} />
            ) : null}
            {hasCoords ? (
              <ListRow
                leading={<SF name="map.fill" size={18} color={T.brand} />}
                title={tr('Открыть точку на карте')}
                subtitle={`${trip.meetLat!.toFixed(5)}, ${trip.meetLng!.toFixed(5)}`}
                chevron onPress={openMeetOnMap} />
            ) : null}
          </ListSection></Wrapper>
        ) : null}

        {trip.city ? <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Город"><ListRow title={trip.city} /></ListSection></Wrapper> : null}
        {trip.organizer ? (
          <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Организатор')}>
            <ListRow
              leading={<View style={{ width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: '#fff' }]}>{trip.organizer.charAt(0)}</Text></View>}
              title={trip.organizer} subtitle={trip.organizerType} />
          </ListSection></Wrapper>
        ) : null}

        {/* Инструменты организатора. Раньше их не было вовсе: человек создавал
            поездку и не мог ни увидеть заявки, ни принять решение. */}
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
              onPress={() => navigation.navigate('EventApplicants', { kind: 'trip', eventId: trip.id, title: trip.title })}
            />
          </ListSection></Wrapper>
        ) : null}

        {trip.itinerary.length > 0 ? (
        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={trip.days > 0 ? `Маршрут · ${trip.days} дн.` : tr('Маршрут')}>
          {trip.itinerary.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, alignItems: 'center', gap: 4 }}>
                <IconBadge icon={r.icon} size="small" variant="tinted" />
                {i < trip.itinerary.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: T.fillTertiary }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < trip.itinerary.length - 1 ? 12 : 0 }}>
                <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]} numberOfLines={1}>{r.day}</Text>
                <Text style={[ty.body, { color: T.label, marginTop: 2 }]} numberOfLines={2}>{r.title}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{r.note}</Text>
              </View>
            </View>
          ))}
        </ListSection></Wrapper>
        ) : null}

        {trip.included.length > 0 ? (
        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={tr('Что включено')}>
          {trip.included.map((it, i) => (
            <ListRow key={i} leading={<SF name={it.icon} size={18} color={T.brand} />} title={it.t}
              trailing={<SF name="checkmark" size={16} color={T.green} />} />
          ))}
        </ListSection></Wrapper>
        ) : null}

        <Wrapper marginTop={6} marginHorizontal={16}><ListSection header={`Идут · ${pl.people(goingCount)}`}>
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
            {tr('Эта поездка уже состоялась. Из ленты она ушла, запись закрыта.')}
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
