import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { tr } from '../../state/LanguageContext';
import { View, Text, ScrollView, Share, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { SF } from '../../components/SFIcon';
import { NavHeader, NavRoundButton } from '../../components/NavHeader';
import { Capsule, ListSection, ListRow, IconCircle, PrimaryButton, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { fetchTrip, Trip, spotsLeft, UNLIMITED_SPOTS } from '../../data/community';
import { useEnrollment } from '../../state/EnrollmentContext';
import { imgUrl, applyToTrip, joinFailureMessage } from '../../data/api';
import { useAuth } from '@clerk/clerk-expo';
import { CommunityStackParams } from '../../navigation/types';

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
function meetAtLabel(raw: string): string {
  const s = raw.replace('T', ' ').replace(/Z$/, '').trim();
  // «2026-07-12 09:00:00» → «2026-07-12 09:00»; всё остальное оставляем как есть.
  const m = s.match(/^(.*\d{1,2}:\d{2})(?::\d{2})?(?:\.\d+)?$/);
  return m ? m[1] : s;
}

export function TripDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { has, toggle, add, statusOf } = useEnrollment();
  const { getToken, isSignedIn } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      // Токен нужен, чтобы участник видел и УЖЕ ЗАКРЫТУЮ поездку: публичный
      // список отдаёт только открытые.
      let token: string | null = null;
      try { token = isSignedIn ? await getToken() : null; } catch { token = null; }
      const t = await fetchTrip(route.params.tripId, token);
      if (alive) { setTrip(t); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [route.params.tripId, isSignedIn]);

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
  const status = statusOf(`trip:${trip.id}`);
  const joined = status === 'approved';
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

  const apply = async () => {
    if (joined || pending || joining) return;
    setJoining(true);
    try {
      const token = await getToken();
      const res = await applyToTrip(token, trip.id);
      if (res.ok) {
        // Заявку ещё рассматривает организатор — местом это не является.
        add(`trip:${trip.id}`, 'pending');
        Alert.alert(tr('Заявка отправлена'), `Организатор рассмотрит заявку на «${trip.title}» и свяжется с вами.`);
      } else {
        const m = joinFailureMessage(res);
        Alert.alert(tr(m.title), tr(m.body));
        // Мест уже нет — обновим карточку, чтобы счётчик стал честным.
        if (res.reason === 'full' || res.reason === 'closed') {
          const t = await fetchTrip(trip.id, token).catch(() => null);
          if (t) setTrip(t);
        }
      }
    } catch {
      Alert.alert(tr('Нет связи'), tr('Проверьте подключение и попробуйте снова.'));
    } finally {
      setJoining(false);
    }
  };

  const buttonLabel = joined ? 'Вы записаны ✓' : pending ? 'Заявка на рассмотрении' : `Записаться · ${trip.price}`;

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
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
          <NavHeader
            variant="overlay" overlayScheme="light"
            backLabel={tr('Сообщество')} onBack={() => navigation.goBack()}
            trailing={<>
              <NavRoundButton icon={fav ? 'heart.fill' : 'heart'} scheme="light" accessibilityLabel={tr('В избранное')} onPress={() => toggle(`tripfav:${trip.id}`)} />
              <NavRoundButton icon="square.and.arrow.up" scheme="light" accessibilityLabel={tr('Поделиться')} onPress={() => Share.share({ message: [`${trip.title} — поездка Divergents`, trip.region, trip.date].filter(Boolean).join(' · ') })} />
            </>}
          />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            {meta ? <Capsule bg="rgba(255,255,255,0.75)" color={T.label}><SF name="calendar" size={11} color={T.brand} />{meta}</Capsule> : null}
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]} numberOfLines={1}>{trip.title}</Text>
            {subtitle ? <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
              {/* «Мест без ограничения» не влезает в одну строку у трети ширины. */}
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={2}>{s.l}</Text>
            </View>
          ))}
        </View>

        {trip.description ? (
          <ListSection header={tr('О поездке')}>
            <View style={{ padding: 14 }}>
              <Text style={[ty.body, { color: T.label }]}>{trip.description}</Text>
            </View>
          </ListSection>
        ) : null}

        {/* Место сбора: сервер его сохранял, но экран никогда не показывал. */}
        {(trip.meetPlace || meetAt || hasCoords) ? (
          <ListSection header={tr('Место сбора')}>
            {trip.meetPlace ? (
              <ListRow leading={<SF name="mappin.and.ellipse" size={18} color={T.brand} />} title={trip.meetPlace} last={!meetAt && !hasCoords} />
            ) : null}
            {meetAt ? (
              <ListRow leading={<SF name="clock.fill" size={18} color={T.brand} />} title={meetAt} subtitle={tr('Время сбора')} last={!hasCoords} />
            ) : null}
            {hasCoords ? (
              <ListRow
                leading={<SF name="map.fill" size={18} color={T.brand} />}
                title={tr('Открыть точку на карте')}
                subtitle={`${trip.meetLat!.toFixed(5)}, ${trip.meetLng!.toFixed(5)}`}
                chevron onPress={openMeetOnMap} last />
            ) : null}
          </ListSection>
        ) : null}

        {trip.organizer ? (
          <ListSection header={tr('Организатор')}>
            <ListRow
              leading={<View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: '#fff' }]}>{trip.organizer.charAt(0)}</Text></View>}
              title={trip.organizer} subtitle={trip.organizerType} last />
          </ListSection>
        ) : null}

        {trip.itinerary.length > 0 ? (
        <ListSection header={trip.days > 0 ? `Маршрут · ${trip.days} дн.` : tr('Маршрут')}>
          {trip.itinerary.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, alignItems: 'center', gap: 4 }}>
                <IconCircle icon={r.icon} bg={r.color + '22'} color={r.color} size={28} />
                {i < trip.itinerary.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: T.fillTertiary }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < trip.itinerary.length - 1 ? 12 : 0 }}>
                <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]} numberOfLines={1}>{r.day}</Text>
                <Text style={[ty.body, { color: T.label, marginTop: 2 }]} numberOfLines={2}>{r.title}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{r.note}</Text>
              </View>
            </View>
          ))}
        </ListSection>
        ) : null}

        {trip.included.length > 0 ? (
        <ListSection header={tr('Что включено')}>
          {trip.included.map((it, i) => (
            <ListRow key={i} leading={<SF name={it.icon} size={18} color={T.brand} />} title={it.t}
              trailing={<SF name="checkmark" size={16} color={T.green} />} last={i === trip.included.length - 1} />
          ))}
        </ListSection>
        ) : null}

        <ListSection header={`Идут · ${goingCount} человек`}>
          {goingCount === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Пока никто не записался — будьте первым.')}</Text>
            </View>
          ) : (
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: Math.min(goingCount, 9) }).map((_, i) => (
                <View key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="person.fill" size={18} color={T.brand} />
                </View>
              ))}
              {goingCount > 9 ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.subheadEm, { color: T.labelSecondary }]}>+{goingCount - 9}</Text>
                </View>
              ) : null}
            </View>
          )}
        </ListSection>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        {pending ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]}>
            {tr('Организатор рассмотрит заявку и подтвердит участие.')}
          </Text>
        ) : left === 0 && !joined ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]}>
            {tr('Свободных мест нет — можно оставить заявку в лист ожидания у организатора.')}
          </Text>
        ) : null}
        <PrimaryButton
          label={buttonLabel}
          icon={joined ? 'checkmark' : pending ? 'clock.fill' : 'paperplane.fill'}
          loading={joining}
          color={joined ? T.green : pending ? T.orange : T.brand}
          onPress={apply}
        />
      </View>
    </View>
  );
}
