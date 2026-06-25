import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { usePlaces } from '../../state/PlacesContext';
import { Place } from '../../data/places';
import { CATEGORY_META, CATEGORIES, TAG_META, TAGS, PlaceCategory, PlaceTag, cityCenter, COUNTRIES } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'AddPlace'>;

export function AddPlaceScreen({ navigation, route }: Props) {
  const { T, isDark } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { country, city, addPlace, updatePlace, getPlace } = usePlaces();
  const editId = route.params?.editId;
  const editing: Place | undefined = editId ? getPlace(editId) : undefined;
  const initLat = editing?.lat ?? route.params?.lat ?? cityCenter(country, city)!.lat;
  const initLng = editing?.lng ?? route.params?.lng ?? cityCenter(country, city)!.lng;
  const center = cityCenter(country, city)!;
  const cityName = center?.name ?? '';
  const countryName = COUNTRIES.find((c) => c.key === country)?.name ?? '';

  const [name, setName] = useState(editing?.name ?? '');
  const [cat, setCat] = useState<PlaceCategory>(editing?.category ?? 'cafe');
  const [tags, setTags] = useState<PlaceTag[]>(editing?.tags ?? []);
  const [highlights, setHighlights] = useState(editing?.highlights ?? '');
  const [hours, setHours] = useState(editing?.hours && editing.hours !== 'Не указано' ? editing.hours : '');
  const [coord, setCoord] = useState({ latitude: initLat, longitude: initLng });
  const [photo, setPhoto] = useState<string | null>(editing?.photo ?? null);

  const toggle = (t: PlaceTag) => setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!r.canceled && r.assets?.[0]?.uri) setPhoto(r.assets[0].uri);
  };
  const ok = name.trim().length > 1 && highlights.trim().length > 2;

  const submit = () => {
    if (editing) {
      updatePlace(editing.id, { name: name.trim(), category: cat, lat: coord.latitude, lng: coord.longitude, tags, highlights: highlights.trim(), hours: hours.trim() || 'Не указано', photo });
      Alert.alert('Сохранено', 'Изменения применены.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
      return;
    }
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Вы';
    addPlace({
      name: name.trim(), category: cat, country, city, lat: coord.latitude, lng: coord.longitude,
      tags, highlights: highlights.trim(), hours: hours.trim() || 'Не указано', approved: false, addedBy: author, photo,
    });
    Alert.alert('Место добавлено', 'Спасибо! Метка появилась на карте сообщества.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>{tr('Отмена')}</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>{editing ? 'Редактировать' : 'Новое место'}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <Text style={[ty.caption1, { color: T.labelSecondary, marginBottom: 12 }]}>{tr('Город:')} {cityName}, {countryName} · {tr('нажмите на карту, чтобы поставить точку')}</Text>

        {/* Map picker */}
        <View style={{ borderRadius: 16, overflow: 'hidden', height: 220, marginBottom: 16 }}>
          <MapView style={{ flex: 1 }}
            initialRegion={{ latitude: initLat, longitude: initLng, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            onPress={(e) => setCoord(e.nativeEvent.coordinate)}>
            <Marker draggable coordinate={coord} pinColor={CATEGORY_META[cat].color}
              onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)} />
          </MapView>
        </View>

        <Field label={tr('НАЗВАНИЕ')}><TextInput value={name} onChangeText={setName} placeholder={tr('напр. Coffee BOOM')} placeholderTextColor={T.labelTertiary} style={inp(T)} /></Field>

        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('КАТЕГОРИЯ')}</Text>
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

        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('ОСОБЕННОСТИ')}</Text>
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

        <Field label={tr('ЧЕМ ХОРОШО')}><TextInput value={highlights} onChangeText={setHighlights} placeholder={tr('напр. Вкусный колд брю, тихо, есть розетки')} placeholderTextColor={T.labelTertiary} multiline style={[inp(T), { minHeight: 80, textAlignVertical: 'top' }]} /></Field>
        <Field label={tr('ЧАСЫ РАБОТЫ')}><TextInput value={hours} onChangeText={setHours} placeholder={tr('напр. 09:00–23:00')} placeholderTextColor={T.labelTertiary} style={inp(T)} /></Field>

        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('ФОТО')}</Text>
        {photo ? (
          <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            <Image source={{ uri: photo }} style={{ width: '100%', height: 180 }} contentFit="cover" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable onPress={pickPhoto} style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.brand }]}>{tr('Заменить')}</Text></Pressable>
              <Pressable onPress={() => setPhoto(null)} style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.label }]}>{tr('Удалить')}</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={pickPhoto} style={{ height: 90, borderRadius: 14, borderWidth: 1, borderColor: T.separator, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, flexDirection: 'row' }}>
            <SF name="photo" size={18} color={T.brand} /><Text style={[ty.subhead, { color: T.brand }]}>{tr('Добавить фото')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={editing ? 'Сохранить' : 'Добавить место'} icon="checkmark" disabled={!ok} onPress={submit} />
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
