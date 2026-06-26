import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, Share, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, IconCircle, PrimaryButton, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { fetchTrip, Trip } from '../../data/community';
import { useEnrollment } from '../../state/EnrollmentContext';
import { imgUrl } from '../../data/api';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'TripDetail'>;

function RoundBtn({ icon, onPress }: { icon: string; onPress?: () => void }) {
  const { T } = useTheme();
  useLang();
  return (
    <Pressable onPress={onPress} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={16} color={T.label} />
    </Pressable>
  );
}

export function TripDetailScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { has, toggle, add } = useEnrollment();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTrip(route.params.tripId).then((t) => { if (alive) { setTrip(t); setLoading(false); } });
    return () => { alive = false; };
  }, [route.params.tripId]);

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <SF name="chevron.left" size={20} color={T.brand} />
            <Text style={[ty.body, { color: T.brand }]}>{tr('Сообщество')}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      </View>
    );
  }

  // ── Not found ──
  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <SF name="chevron.left" size={20} color={T.brand} />
            <Text style={[ty.body, { color: T.brand }]}>{tr('Сообщество')}</Text>
          </Pressable>
        </View>
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
  const joined = has(`trip:${trip.id}`);
  const goingCount = trip.going + (joined ? 1 : 0);
  const spotsCount = Math.max(0, trip.spots - (joined ? 1 : 0));
  const stats = [
    { v: String(goingCount), l: tr('Идут') },
    { v: String(spotsCount), l: tr('Мест') },
    { v: trip.price, l: tr('Стоимость') },
  ];

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
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RoundBtn icon="chevron.left" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundBtn icon={fav ? 'heart.fill' : 'heart'} onPress={() => toggle(`tripfav:${trip.id}`)} />
              <RoundBtn icon="square.and.arrow.up" onPress={() => Share.share({ message: `${trip.title} — поездка Divergents · ${trip.region} · ${trip.date}` })} />
            </View>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <Capsule bg="rgba(255,255,255,0.75)" color={T.label}><SF name="calendar" size={11} color={T.brand} />{trip.date} · {trip.days} дн.</Capsule>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}>{trip.title}</Text>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]}>{trip.region} · сложность: {trip.difficulty}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
              <Text style={[ty.headline, { color: T.label }]}>{s.v}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <ListSection header={tr('О поездке')}>
          <View style={{ padding: 14 }}>
            <Text style={[ty.body, { color: T.label }]}>{trip.description}</Text>
          </View>
        </ListSection>

        <ListSection header={tr('Организатор')}>
          <ListRow
            leading={<View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: '#fff' }]}>{(trip.organizer || '?').charAt(0)}</Text></View>}
            title={trip.organizer} subtitle={trip.organizerType} last />
        </ListSection>

        <ListSection header={`Маршрут · ${trip.days} дн.`}>
          {trip.itinerary.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, alignItems: 'center', gap: 4 }}>
                <IconCircle icon={r.icon} bg={r.color + '22'} color={r.color} size={28} />
                {i < trip.itinerary.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: T.fillTertiary }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < trip.itinerary.length - 1 ? 12 : 0 }}>
                <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]}>{r.day}</Text>
                <Text style={[ty.body, { color: T.label, marginTop: 2 }]}>{r.title}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{r.note}</Text>
              </View>
            </View>
          ))}
        </ListSection>

        <ListSection header={tr('Что включено')}>
          {trip.included.map((it, i) => (
            <ListRow key={i} leading={<SF name={it.icon} size={18} color={T.brand} />} title={it.t}
              trailing={<SF name="checkmark" size={16} color={T.green} />} last={i === trip.included.length - 1} />
          ))}
        </ListSection>

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
        <PrimaryButton
          label={joined ? 'Вы записаны ✓' : `Записаться · ${trip.price}`}
          icon={joined ? 'checkmark' : 'paperplane.fill'}
          color={joined ? T.green : T.brand}
          onPress={() => {
            if (joined) return;
            add(`trip:${trip.id}`);
            Alert.alert('Заявка принята', `Мы свяжемся с вами по деталям поездки «${trip.title}».`);
          }}
        />
      </View>
    </View>
  );
}
