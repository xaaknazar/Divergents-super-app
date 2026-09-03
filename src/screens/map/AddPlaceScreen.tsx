import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import type { Typography } from '../../theme/tokens';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton, Chip } from '../../components/ui';
import { usePlaces } from '../../state/PlacesContext';
import { Place, postPlace } from '../../data/places';
import { uploadFile } from '../../data/api';
import { CATEGORY_META, CATEGORIES, TAG_META, TAGS, PlaceCategory, PlaceTag, safeCityCenter, COUNTRIES } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'AddPlace'>;

// Picked images live in the OS cache and are purged after restart, breaking
// the photo. Copy into the app's document directory (persistent) and store
// that file:// path instead. Best-effort: falls back to the original uri.
async function persistImage(uri: string): Promise<string> {
  try {
    if (!uri.startsWith('file:') || !FileSystem.documentDirectory) return uri;
    const dir = `${FileSystem.documentDirectory}places/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').slice(0, 5);
    const dest = `${dir}place_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export function AddPlaceScreen({ navigation, route }: Props) {
  const { T, isDark, ty } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { country, city, addPlace, updatePlace, getPlace } = usePlaces();
  const editId = route.params?.editId;
  const editing: Place | undefined = editId ? getPlace(editId) : undefined;
  const center = safeCityCenter(country, city);
  const initLat = editing?.lat ?? route.params?.lat ?? center.lat;
  const initLng = editing?.lng ?? route.params?.lng ?? center.lng;
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
    if (!perm.granted) {
      Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее в настройках.', [
        { text: tr('Открыть настройки'), onPress: () => Linking.openSettings().catch(() => {}) },
        { text: tr('Отмена'), style: 'cancel' },
      ]);
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!r.canceled && r.assets?.[0]?.uri) setPhoto(await persistImage(r.assets[0].uri));
  };
  // What is still missing for the CTA — shown as a hint so the disabled button
  // never leaves the user guessing.
  const missing = [
    name.trim().length > 1 ? null : tr('название'),
    highlights.trim().length > 2 ? null : tr('чем хорошо место'),
  ].filter(Boolean) as string[];
  const ok = missing.length === 0;
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (editing) {
      // updatePlace is local-only (own places live on-device) — say so honestly.
      updatePlace(editing.id, { name: name.trim(), category: cat, lat: coord.latitude, lng: coord.longitude, tags, highlights: highlights.trim(), hours: hours.trim() || 'Не указано', photo });
      Alert.alert('Сохранено', 'Изменения сохранены на этом устройстве.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
      return;
    }
    setSubmitting(true);
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Вы';
    const draft = {
      name: name.trim(), category: cat, country, city, lat: coord.latitude, lng: coord.longitude,
      tags, highlights: highlights.trim(), hours: hours.trim() || 'Не указано', addedBy: author, photo,
    };
    // Always keep the place on-device so the author sees it immediately.
    addPlace({ ...draft, approved: false });
    // Publish to the server. Upload the photo first (a local file:// path is
    // useless to other users) and send the resulting URL. Message is HONEST:
    // only promise "everyone will see it after moderation" when the server
    // actually accepted the place.
    let published = false;
    try {
      const token = await getToken();
      let serverPhoto: string | null = photo && photo.startsWith('file:') ? null : (photo ?? null);
      if (photo && photo.startsWith('file:')) {
        const fname = photo.split('/').pop() || `place_${Date.now()}.jpg`;
        serverPhoto = await uploadFile(token, photo, fname, 'image/jpeg');
      }
      const id = await postPlace({ ...draft, photo: serverPhoto }, token);
      published = !!id;
    } catch {
      published = false;
    } finally {
      setSubmitting(false);
    }
    if (published) {
      Alert.alert('Место добавлено', 'Спасибо! После модерации метку увидят все участники сообщества.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
    } else {
      Alert.alert('Сохранено у вас', 'Метка добавлена на вашей карте, но отправить её на модерацию не удалось — проверьте связь и попробуйте позже.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={editing ? 'Редактировать' : 'Новое место'} backLabel={tr('Отмена')} onBack={() => navigation.goBack()} />

      {/* The header sits outside the KAV, so offset by its height (safe-area + bar). */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 52}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
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

        <Field label={tr('Название')}><TextInput value={name} onChangeText={setName} placeholder={tr('напр. Coffee BOOM')} placeholderTextColor={T.labelTertiary} accessibilityLabel={tr('Название')} style={inp(T, ty)} /></Field>

        <FieldLabel>{tr('Категория')}</FieldLabel>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_META[c].label} icon={CATEGORY_META[c].icon} active={cat === c} onPress={() => setCat(c)} />
          ))}
        </View>

        <FieldLabel>{tr('Особенности')}</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TAGS.map((t) => (
            <Chip key={t} label={TAG_META[t].label} icon={TAG_META[t].icon} active={tags.includes(t)} onPress={() => toggle(t)} />
          ))}
        </View>

        <Field label={tr('Чем хорошо')}><TextInput value={highlights} onChangeText={setHighlights} placeholder={tr('напр. Вкусный колд брю, тихо, есть розетки')} placeholderTextColor={T.labelTertiary} accessibilityLabel={tr('Чем хорошо')} multiline style={[inp(T, ty), { minHeight: 80, textAlignVertical: 'top' }]} /></Field>
        <Field label={tr('Часы работы')}><TextInput value={hours} onChangeText={setHours} placeholder={tr('напр. 09:00–23:00')} placeholderTextColor={T.labelTertiary} accessibilityLabel={tr('Часы работы')} style={inp(T, ty)} /></Field>

        <FieldLabel>{tr('Фото')}</FieldLabel>
        {photo ? (
          <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            <Image source={{ uri: photo }} style={{ width: '100%', height: 180 }} contentFit="cover" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={tr('Заменить фото')} onPress={pickPhoto} style={{ flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.brandText }]} numberOfLines={1}>{tr('Заменить')}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={tr('Удалить фото')} onPress={() => setPhoto(null)} style={{ flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1}>{tr('Удалить')}</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={tr('Добавить фото')} style={{ minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: T.separator, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, flexDirection: 'row' }}>
            <SF name="photo" size={18} color={T.brandText} /><Text style={[ty.subhead, { color: T.brandText }]} numberOfLines={1}>{tr('Добавить фото')}</Text>
          </Pressable>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        {!ok ? (
          <Text accessibilityLiveRegion="polite" style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginBottom: 8 }]} numberOfLines={2}>
            {tr('Осталось заполнить:')} {missing.join(', ')}
          </Text>
        ) : null}
        <PrimaryButton label={editing ? 'Сохранить' : 'Добавить место'} icon="checkmark" loading={submitting} disabled={!ok || submitting} onPress={submit} />
      </View>
    </View>
  );
}

// Section label: source text stays in sentence case, the uppercase is a style
// (so VoiceOver reads a word, not a spelled-out acronym).
function FieldLabel({ children }: { children: string }) {
  const { T, ty } = useTheme();
  return (
    <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.4 }]} numberOfLines={1}>{children}</Text>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}
function inp(T: any, ty: Typography) { return { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body }; }
