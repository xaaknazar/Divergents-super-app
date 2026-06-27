import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { createChallenge, createTrip, createChannel, createSport, uploadFile } from '../../data/api';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateContent'>;
type Kind = 'challenge' | 'trip' | 'channel' | 'sport';

export function CreateContentScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [kind, setKind] = useState<Kind>('challenge');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [days, setDays] = useState('21');
  const [price, setPrice] = useState('');
  const [teams, setTeams] = useState('Команда А, Команда Б');
  const [region, setRegion] = useState('');
  const [place, setPlace] = useState('');
  const [meetPlace, setMeetPlace] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [meetCoord, setMeetCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [date, setDate] = useState('');
  const [spots, setSpots] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [desc, setDesc] = useState('');
  const [access, setAccess] = useState<'open' | 'request' | 'paid'>('open');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avBusy, setAvBusy] = useState(false);

  const ok = title.trim().length > 1;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа к фото', 'Разрешите доступ к галерее.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setAvBusy(true);
    try { const token = await getToken(); const url = await uploadFile(token, r.assets[0].uri, 'avatar.jpg', 'image/jpeg'); if (url) setAvatar(url); else Alert.alert('Не удалось загрузить фото'); }
    finally { setAvBusy(false); }
  };

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    let success = false;
    try {
      const token = await getToken();
      if (kind === 'challenge') {
        success = await createChallenge(token, { title: title.trim(), durationDays: Number(days) || 21, price: price.trim() || null, teams: teams.split(',').map((t) => t.trim()).filter(Boolean) });
      } else if (kind === 'trip') {
        success = await createTrip(token, { title: title.trim(), region: region.trim() || null, date: date.trim() || null, days: Number(days) || 1, price: price.trim() || null, spots: Number(spots) || 0, difficulty: difficulty.trim() || null, description: desc.trim() || null, meetPlace: meetPlace.trim() || null, meetLat: meetCoord?.latitude ?? null, meetLng: meetCoord?.longitude ?? null, meetAt: meetAt.trim() || null });
      } else if (kind === 'sport') {
        success = await createSport(token, { title: title.trim(), place: place.trim() || null, date: date.trim() || null, spots: Number(spots) || 0, description: desc.trim() || null, meetLat: meetCoord?.latitude ?? null, meetLng: meetCoord?.longitude ?? null, meetAt: date.trim() || null });
      } else {
        success = await createChannel(token, { name: title.trim(), access, price: access === 'paid' ? price.trim() || null : null, bio: bio.trim() || null, avatarUrl: avatar || undefined });
      }
    } catch {}
    setBusy(false);
    if (success) Alert.alert('Создано', 'Опубликовано и доступно в приложении.', [{ text: 'Готово', onPress: () => navigation.goBack() }]);
    else Alert.alert('Не удалось создать', 'Проверьте подключение и права (нужен email-куратор).');
  };

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>Отмена</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>Создать</Text>
        <View style={{ width: 56 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Seg items={[{ k: 'challenge', label: 'Челлендж' }, { k: 'trip', label: 'Поездка' }, { k: 'sport', label: 'Спорт' }, { k: 'channel', label: 'Группа' }]} value={kind} onChange={setKind} />

          <Field label={kind === 'channel' ? 'НАЗВАНИЕ ГРУППЫ' : 'НАЗВАНИЕ'}>
            <TextInput value={title} onChangeText={setTitle} placeholder={kind === 'trip' ? 'напр. Кольсай и Каинды' : kind === 'sport' ? 'напр. Футбол по субботам' : kind === 'channel' ? 'напр. Women’s club' : 'напр. Divergents challenge'} placeholderTextColor={T.labelTertiary} style={inp} />
          </Field>

          {kind === 'challenge' ? (
            <>
              <Field label="ДЛИТЕЛЬНОСТЬ (ДНЕЙ)"><TextInput value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} /></Field>
              <Field label="ЦЕНА (ОПЦ.)"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 12 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="КОМАНДЫ (ЧЕРЕЗ ЗАПЯТУЮ)"><TextInput value={teams} onChangeText={setTeams} style={inp} /></Field>
            </>
          ) : kind === 'trip' ? (
            <>
              <Field label="РЕГИОН"><TextInput value={region} onChangeText={setRegion} placeholder="напр. Алматинская область" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="ДАТА"><TextInput value={date} onChangeText={setDate} placeholder="напр. 12–14 июля" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="ДНЕЙ"><TextInput value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} /></Field></View>
                <View style={{ flex: 1 }}><Field label="МЕСТ"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} /></Field></View>
              </View>
              <Field label="ЦЕНА"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 45 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="СЛОЖНОСТЬ"><TextInput value={difficulty} onChangeText={setDifficulty} placeholder="напр. средняя" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="МЕСТО ВСТРЕЧИ"><TextInput value={meetPlace} onChangeText={setMeetPlace} placeholder="напр. у входа в парк" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="ВРЕМЯ ВСТРЕЧИ"><TextInput value={meetAt} onChangeText={setMeetAt} placeholder="ГГГГ-ММ-ДД ЧЧ:ММ — напр. 2026-07-12 09:00" placeholderTextColor={T.labelTertiary} autoCapitalize="none" style={inp} /></Field>
              <Field label="ТОЧКА ВСТРЕЧИ НА КАРТЕ">
                <View style={{ borderRadius: 14, overflow: 'hidden', height: 180 }}>
                  <MapView style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? 43.238, longitude: meetCoord?.longitude ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor="#2f5bd6" /> : null}
                  </MapView>
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 6 }]}>{meetCoord ? 'Точка выбрана ✓ — нажмите, чтобы изменить' : 'Нажмите на карту, чтобы поставить точку встречи'}</Text>
              </Field>
              <Field label="ОПИСАНИЕ"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко о поездке" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} /></Field>
            </>
          ) : kind === 'sport' ? (
            <>
              <Field label="МЕСТО"><TextInput value={place} onChangeText={setPlace} placeholder="напр. Манеж, Алматы" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="ДАТА/ВРЕМЯ"><TextInput value={date} onChangeText={setDate} placeholder="напр. сб 10:00" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
              <Field label="МЕСТ"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} /></Field>
              <Field label="ОПИСАНИЕ"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} /></Field>
              <Field label="МЕСТО НА КАРТЕ">
                <View style={{ borderRadius: 14, overflow: 'hidden', height: 180 }}>
                  <MapView style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? 43.238, longitude: meetCoord?.longitude ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor="#2f5bd6" /> : null}
                  </MapView>
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 6 }]}>{meetCoord ? 'Точка выбрана ✓' : 'Нажмите на карту, чтобы поставить точку'}</Text>
              </Field>
            </>
          ) : (
            <>
              <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <Pressable onPress={pickAvatar}>
                  {avatar ? <Image source={{ uri: avatar }} style={{ width: 84, height: 84, borderRadius: 22 }} contentFit="cover" />
                    : <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={24} color={T.labelSecondary} /></View>}
                  <Text style={[ty.caption1, { color: T.brand, textAlign: 'center', marginTop: 6 }]}>{avBusy ? 'Загрузка…' : 'Фото канала'}</Text>
                </Pressable>
              </View>
              <Field label="ТИП ДОСТУПА">
                <Seg items={[{ k: 'open', label: 'Открытая' }, { k: 'request', label: 'По запросу' }, { k: 'paid', label: 'Платная' }]} value={access} onChange={setAccess} />
              </Field>
              {access === 'paid' ? <Field label="ЦЕНА"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 500 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} /></Field> : null}
              <Field label="ОПИСАНИЕ"><TextInput value={bio} onChangeText={setBio} multiline placeholder="О чём группа" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} /></Field>
            </>
          )}
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <PrimaryButton label="Опубликовать" icon="checkmark" loading={busy} disabled={!ok} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}


function Seg({ items, value, onChange }: { items: { k: string; label: string }[]; value: string; onChange: (k: any) => void }) {
  const { T } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 12, padding: 4 }}>
      {items.map((it) => {
        const on = value === it.k;
        return (
          <Pressable key={it.k} onPress={() => onChange(it.k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: on ? T.cardBg : 'transparent' }}>
            <Text style={[ty.footnoteEm, { color: on ? T.brand : T.labelSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]} numberOfLines={1}>{label}</Text>
      {children}
    </View>
  );
}
