import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Modal, LayoutAnimation } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, ty } from '../../components/ui';
import { Stars } from '../../components/Stars';
import { Aurora } from '../../components/Aurora';
import { usePlaces, filterPlaces, ratingOf } from '../../state/PlacesContext';
import { COUNTRIES, CATEGORY_META, TAG_META, TAGS, CATEGORIES, PlaceCategory, PlaceTag, cityCenter, Place } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'MapHome'>;

export function MapHomeScreen({ navigation }: Props) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { country, city, setLocation, places } = usePlaces();
  const [cat, setCat] = useState<PlaceCategory | null>(null);
  const [tags, setTags] = useState<PlaceTag[]>([]);
  const [q, setQ] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const center = cityCenter(country, city);
  const countryName = COUNTRIES.find((c) => c.key === country)?.name ?? '';
  const cityName = center?.name ?? '';

  const list = useMemo(() => filterPlaces(places, country, city, cat, tags, q), [places, country, city, cat, tags, q]);
  const sel = selId ? places.find((p) => p.id === selId) : null;

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.animateToRegion({ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 600);
    }
  }, [country, city]);

  const toggleTag = (t: PlaceTag) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]); };
  const openPlace = (id: string) => navigation.navigate('PlaceDetail', { placeId: id });

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <Aurora />
      <View style={{ paddingTop: insets.top + 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }}>
          <View>
            <Text style={[ty.largeTitle, { color: T.label }]}>Места</Text>
            <Pressable onPress={() => setPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <SF name="mappin.circle.fill" size={14} color={T.brand} />
              <Text style={[ty.subheadEm, { color: T.brand }]}>{cityName}, {countryName}</Text>
              <SF name="chevron.down" size={11} color={T.brand} />
            </Pressable>
          </View>
          <Pressable onPress={() => isSignedIn ? navigation.navigate('AddPlace') : navigation.getParent()?.getParent()?.navigate('Auth' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.brand, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14 }}>
            <SF name="plus" size={15} color="#fff" />
            <Text style={[ty.subheadEm, { color: '#fff' }]}>Добавить</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.fillTertiary, borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
            <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
            <TextInput value={q} onChangeText={setQ} placeholder="Поиск места" placeholderTextColor={T.labelTertiary} style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0 }]} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
          <Chip label="Все" active={!cat} onPress={() => setCat(null)} T={T} />
          {CATEGORIES.map((c) => <Chip key={c} label={CATEGORY_META[c].label} icon={CATEGORY_META[c].icon} active={cat === c} onPress={() => setCat(cat === c ? null : c)} T={T} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
          {TAGS.map((t) => <Chip key={t} label={TAG_META[t].label} icon={TAG_META[t].icon} active={tags.includes(t)} onPress={() => toggleTag(t)} T={T} />)}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        <View style={{ marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', height: 280, backgroundColor: T.secondaryBg }}>
          {center ? (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
              userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
              {list.map((p) => (
                <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name}
                  description={p.highlights} pinColor={CATEGORY_META[p.category].color}
                  onPress={() => setSelId(p.id)} />
              ))}
            </MapView>
          ) : null}
        </View>

        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }]}>
          Найдено: {list.length}
        </Text>
        {list.map((p) => <PlaceCard key={p.id} place={p} onPress={() => openPlace(p.id)} T={T} />)}
        {list.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <SF name="mappin.and.ellipse" size={32} color={T.labelTertiary} />
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10, textAlign: 'center' }]}>Здесь пока нет мест. Будь первым — добавь!</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setPickerOpen(false)} />
        <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '70%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
          <Text style={[ty.title3, { color: T.label, paddingHorizontal: 20, paddingBottom: 8 }]}>Выберите город</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
            {COUNTRIES.map((co) => (
              <View key={co.key}>
                <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }]}>{co.name}</Text>
                {co.cities.map((ci) => {
                  const on = co.key === country && ci.key === city;
                  return (
                    <Pressable key={ci.key} onPress={() => { setLocation(co.key, ci.key); setPickerOpen(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: on ? T.brandTinted : 'transparent' }}>
                      <SF name="mappin.circle.fill" size={18} color={on ? T.brand : T.labelTertiary} />
                      <Text style={[ty.body, { color: T.label, flex: 1 }]}>{ci.name}</Text>
                      {on ? <SF name="checkmark" size={16} color={T.brand} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Place peek bottom-sheet */}
      <Modal visible={!!sel} animationType="slide" transparent onRequestClose={() => setSelId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setSelId(null)} />
        {sel ? (
          <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: CATEGORY_META[sel.category].color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <SF name={CATEGORY_META[sel.category].icon} size={24} color={CATEGORY_META[sel.category].color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{sel.name}</Text>
                    {sel.approved ? <SF name="checkmark.seal.fill" size={15} color="#0EA5E9" /> : null}
                  </View>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{CATEGORY_META[sel.category].label} · {sel.hours}</Text>
                </View>
                {ratingOf(sel) > 0 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[ty.headline, { color: T.label }]}>{ratingOf(sel).toFixed(1)}</Text>
                    <Stars value={ratingOf(sel)} size={11} />
                  </View>
                ) : null}
              </View>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12 }]} numberOfLines={3}>{sel.highlights}</Text>
              {sel.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {sel.tags.slice(0, 5).map((t) => (
                    <Capsule key={t} bg={T.brandTinted} color={T.brand}><SF name={TAG_META[t].icon} size={10} color={T.brand} />{TAG_META[t].label}</Capsule>
                  ))}
                </View>
              ) : null}
              <Pressable onPress={() => { const id = sel.id; setSelId(null); openPlace(id); }}
                style={{ marginTop: 16, height: 48, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Text style={[ty.headline, { color: '#fff' }]}>Подробнее и отзывы</Text>
                <SF name="chevron.forward" size={15} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Chip({ label, icon, active, onPress, T }: { label: string; icon?: any; active?: boolean; onPress: () => void; T: any }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 18, backgroundColor: active ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: active ? 'transparent' : T.separator }}>
      {icon ? <SF name={icon} size={12} color={active ? '#fff' : T.brand} /> : null}
      <Text style={[ty.footnoteEm, { color: active ? '#fff' : T.label }]}>{label}</Text>
    </Pressable>
  );
}

function PlaceCard({ place, onPress, T }: { place: Place; onPress: () => void; T: any }) {
  const meta = CATEGORY_META[place.category];
  const r = ratingOf(place);
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.cardBg, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
          <SF name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{place.name}</Text>
            {place.approved ? <SF name="checkmark.seal.fill" size={14} color="#0EA5E9" /> : null}
          </View>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{meta.label} · {place.hours}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {r > 0 ? <Text style={[ty.headline, { color: T.label }]}>{r.toFixed(1)}</Text> : <Text style={[ty.caption1, { color: T.labelTertiary }]}>нет оценок</Text>}
          {r > 0 ? <Stars value={r} size={11} /> : null}
        </View>
      </View>
      <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 10 }]} numberOfLines={2}>{place.highlights}</Text>
      {place.tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {place.tags.slice(0, 4).map((t) => (
            <Capsule key={t} bg={T.fillTertiary} color={T.labelSecondary}><SF name={TAG_META[t].icon} size={10} color={T.brand} />{TAG_META[t].label}</Capsule>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
