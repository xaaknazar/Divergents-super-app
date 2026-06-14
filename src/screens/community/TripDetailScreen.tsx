import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { SF, SFName } from '../../components/SFIcon';
import { Capsule, ListSection, ListRow, IconCircle, PrimaryButton, T, ty } from '../../components/ui';
import { getTrip } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'TripDetail'>;

const ITINERARY: { d: string; t: string; m: string; i: SFName; c: string }[] = [
  { d: 'День 1', t: 'Алматы → Сатти', m: 'Выезд 7:00 · 280 км', i: 'mappin.circle.fill', c: T.brand },
  { d: 'День 2', t: 'Поход к озёрам', m: '12 км трек · средняя сложность', i: 'figure.walk', c: T.green },
  { d: 'День 3', t: 'Возвращение', m: 'Завтрак в Сатти · выезд 10:00', i: 'house.fill', c: T.orange },
];

const INCLUDED: { i: SFName; t: string }[] = [
  { i: 'figure.walk', t: 'Гид и сопровождение' },
  { i: 'house.fill', t: 'Ночёвка в Сатти' },
  { i: 'leaf.fill', t: 'Трёхразовое питание' },
  { i: 'cart.fill', t: 'Трансфер Алматы ⇄ Сатти' },
];

function RoundBtn({ icon, onPress }: { icon: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={16} color={T.label} />
    </Pressable>
  );
}

export function TripDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const trip = getTrip(route.params.tripId)!;
  const stats = [
    { v: String(trip.going), l: 'Идут' },
    { v: String(trip.spots), l: 'Мест' },
    { v: trip.price, l: 'Стоимость' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        {/* Hero */}
        <View style={{ height: 280, backgroundColor: '#8AA3BD' }}>
          <Svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="none" style={{ position: 'absolute' }}>
            <Polygon points="0,200 80,120 140,180 220,80 290,160 360,110 400,180 400,280 0,280" fill="rgba(255,255,255,0.18)" />
            <Polygon points="0,230 60,170 130,210 200,140 280,200 340,170 400,210 400,280 0,280" fill="rgba(255,255,255,0.3)" />
          </Svg>
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RoundBtn icon="chevron.left" onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundBtn icon="heart" />
              <RoundBtn icon="square.and.arrow.up" />
            </View>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <Capsule bg="rgba(255,255,255,0.75)" color={T.label}><SF name="calendar" size={11} color={T.brand} />{trip.date} · {trip.days} дня</Capsule>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 10 }]}>{trip.title}</Text>
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

        <ListSection header="Организатор">
          <ListRow
            leading={<View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.headline, { color: '#fff' }]}>{trip.organizer.charAt(0)}</Text></View>}
            title={trip.organizer} subtitle={trip.organizerType} chevron last />
        </ListSection>

        <ListSection header={`Маршрут · ${trip.days} дня`}>
          {ITINERARY.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, alignItems: 'center', gap: 4 }}>
                <IconCircle icon={r.i} bg={r.c + '22'} color={r.c} size={28} />
                {i < ITINERARY.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: T.fillTertiary }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < ITINERARY.length - 1 ? 12 : 0 }}>
                <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]}>{r.d}</Text>
                <Text style={[ty.body, { color: T.label, marginTop: 2 }]}>{r.t}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{r.m}</Text>
              </View>
            </View>
          ))}
        </ListSection>

        <ListSection header="Что включено">
          {INCLUDED.map((it, i) => (
            <ListRow key={i} leading={<SF name={it.i} size={18} color={T.brand} />} title={it.t}
              trailing={<SF name="checkmark" size={16} color={T.green} />} last={i === INCLUDED.length - 1} />
          ))}
        </ListSection>

        <ListSection header={`Идут · ${trip.going} человек`}>
          <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['А', 'Б', 'Д', 'Ж', 'М', 'О', 'К', 'С', 'Т', `+${Math.max(0, trip.going - 9)}`].map((n, i) => (
              <View key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: i === 9 ? T.fillTertiary : `hsl(${i * 40 + 200}, 55%, 65%)`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.subheadEm, { color: i === 9 ? T.labelSecondary : '#fff' }]}>{n}</Text>
              </View>
            ))}
          </View>
        </ListSection>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: 'rgba(249,249,249,0.96)', borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={`Записаться · ${trip.price}`} />
      </View>
    </View>
  );
}
