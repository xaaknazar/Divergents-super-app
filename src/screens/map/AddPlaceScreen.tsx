import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { usePlaces } from '../../state/PlacesContext';
import { CATEGORY_META, CATEGORIES, TAG_META, TAGS, PlaceCategory, PlaceTag, cityCenter, COUNTRIES } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'AddPlace'>;

export function AddPlaceScreen({ navigation }: Props) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { country, city, addPlace } = usePlaces();
  const center = cityCenter(country, city)!;
  const cityName = center?.name ?? '';
  const countryName = COUNTRIES.find((c) => c.key === country)?.name ?? '';

  const [name, setName] = useState('');
  const [cat, setCat] = useState<PlaceCategory>('cafe');
  const [tags, setTags] = useState<PlaceTag[]>([]);
  const [highlights, setHighlights] = useState('');
  const [hours, setHours] = useState('');
  const [coord, setCoord] = useState({ latitude: center.lat, longitude: center.lng });

  const toggle = (t: PlaceTag) => setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const ok = name.trim().length > 1 && highlights.trim().length > 2;

  const submit = () => {
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Вы';
    addPlace({
      name: name.trim(), category: cat, country, city, lat: coord.latitude, lng: coord.longitude,
      tags, highlights: highlights.trim(), hours: hours.trim() || 'Не указано', approved: false, addedBy: author,
    });
    Alert.alert('Место добавлено', 'Спасибо! Метка появилась на карте сообщества.', [{ text: 'Готово', onPress: () => navigation.goBack() }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>Отмена</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>Новое место</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <Text style={[ty.caption1, { color: T.labelSecondary, marginBottom: 12 }]}>Город: {cityName}, {countryName} · нажмите на карту, чтобы поставить точку</Text>

        {/* Map picker */}
        <View style={{ borderRadius: 16, overflow: 'hidden', height: 220, marginBottom: 16 }}>
          <MapView style={{ flex: 1 }}
            initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            onPress={(e) => setCoord(e.nativeEvent.coordinate)}>
            <Marker draggable coordinate={coord} pinColor={CATEGORY_META[cat].color}
              onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)} />
          </MapView>
        </View>

        <Field label="НАЗВАНИЕ"><TextInput value={name} onChangeText={setName} placeholder="напр. Coffee BOOM" placeholderTextColor={T.labelTertiary} style={inp(T)} /></Field>

        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>КАТЕГОРИЯ</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((c) => {
            const on = cat === c;
            return (
              <Pressable key={c} onPress={() => setCat(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18, backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                <SF name={CATEGORY_META[c].icon} size={12} color={on ? '#fff' : T.brand} />
                <Text style={[ty.footnoteEm, { color: on ? '#fff' : T.label }]}>{CATEGORY_META[c].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>ОСОБЕННОСТИ</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <Pressable key={t} onPress={() => toggle(t)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18, backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                <SF name={TAG_META[t].icon} size={12} color={on ? '#fff' : T.brand} />
                <Text style={[ty.footnoteEm, { color: on ? '#fff' : T.label }]}>{TAG_META[t].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="ЧЕМ ХОРОШО"><TextInput value={highlights} onChangeText={setHighlights} placeholder="напр. Вкусный колд брю, тихо, есть розетки" placeholderTextColor={T.labelTertiary} multiline style={[inp(T), { minHeight: 80, textAlignVertical: 'top' }]} /></Field>
        <Field label="ЧАСЫ РАБОТЫ"><TextInput value={hours} onChangeText={setHours} placeholder="напр. 09:00–23:00" placeholderTextColor={T.labelTertiary} style={inp(T)} /></Field>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label="Добавить место" icon="checkmark" disabled={!ok} onPress={submit} />
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{label}</Text>
      {children}
    </View>
  );
}
function inp(T: any) { return { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body }; }
