import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, Segmented } from '../../components/ui';
import { createChallenge, createTrip, createChannel, createSport, uploadFile } from '../../data/api';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateContent'>;
type Kind = 'challenge' | 'trip' | 'channel' | 'sport';
type Access = 'open' | 'request' | 'paid';

const KINDS: { k: Kind; label: string }[] = [
  { k: 'challenge', label: 'Челлендж' }, { k: 'trip', label: 'Поездка' }, { k: 'sport', label: 'Спорт' }, { k: 'channel', label: 'Канал' },
];
const ACCESS: { k: Access; label: string }[] = [
  { k: 'open', label: 'Открытый' }, { k: 'request', label: 'По запросу' }, { k: 'paid', label: 'Платный' },
];

// ── Date helpers: the submit code (and the server) expect these exact strings.
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDateTime = (d: Date) => `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function parseDateString(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 9), Number(m[5] ?? 0));
  return isNaN(d.getTime()) ? null : d;
}
const humanDate = (s: string, withTime: boolean) => {
  const d = parseDateString(s);
  if (!d) return '';
  return d.toLocaleString('ru-RU', withTime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
};

export function CreateContentScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [kind, setKind] = useState<Kind>('challenge');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [days, setDays] = useState('21');
  const [price, setPrice] = useState('');
  // Challenge: start date (YYYY-MM-DD) + teams with an optional captain email.
  const [chStart, setChStart] = useState('');
  const [chTeams, setChTeams] = useState<{ name: string; capacity: string; captainEmail: string }[]>([
    { name: 'Команда А', capacity: '30', captainEmail: '' },
  ]);
  const [region, setRegion] = useState('');
  const [place, setPlace] = useState('');
  const [meetPlace, setMeetPlace] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [meetCoord, setMeetCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [date, setDate] = useState('');
  const [spots, setSpots] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [desc, setDesc] = useState('');
  const [access, setAccess] = useState<Access>('open');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avBusy, setAvBusy] = useState(false);

  const ok = title.trim().length > 1;
  // Anything typed beyond the defaults → ask before discarding on «Отмена».
  const dirty = !!(title || price || chStart || region || place || meetPlace || meetAt || meetCoord || date || spots || difficulty || desc || bio || avatar
    || days !== '21' || chTeams.length !== 1 || chTeams[0]?.name !== 'Команда А' || chTeams[0]?.capacity !== '30' || chTeams[0]?.captainEmail);

  const cancel = () => {
    if (!dirty) { navigation.goBack(); return; }
    Alert.alert('Отменить создание?', 'Введённые данные не сохранятся.', [
      { text: 'Продолжить редактирование', style: 'cancel' },
      { text: 'Отменить', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

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
    let failed = false;
    try {
      const token = await getToken();
      if (kind === 'challenge') {
        const s = chStart.trim();
        const startISO = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T09:00:00`).toISOString() : '';
        if (!startISO || isNaN(Date.parse(startISO))) { setBusy(false); Alert.alert('Укажите дату старта', 'Выберите дату в поле «Дата старта».'); return; }
        const durationDays = Number(days) || 21;
        if (durationDays < 14) { setBusy(false); Alert.alert('Слишком короткий челлендж', 'Минимальная длительность — 14 дней.'); return; }
        const teamsPayload = chTeams.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), capacity: Number(t.capacity) || 30, captainEmail: t.captainEmail.trim() || undefined }));
        if (teamsPayload.length === 0) { setBusy(false); Alert.alert('Добавьте хотя бы одну команду'); return; }
        success = await createChallenge(token, { title: title.trim(), startISO, durationDays, price: price.trim() || null, teams: teamsPayload });
      } else if (kind === 'trip') {
        success = await createTrip(token, { title: title.trim(), region: region.trim() || null, date: date.trim() || null, days: Number(days) || 1, price: price.trim() || null, spots: Number(spots) || 0, difficulty: difficulty.trim() || null, description: desc.trim() || null, meetPlace: meetPlace.trim() || null, meetLat: meetCoord?.latitude ?? null, meetLng: meetCoord?.longitude ?? null, meetAt: meetAt.trim() || null });
      } else if (kind === 'sport') {
        success = await createSport(token, { title: title.trim(), place: place.trim() || null, date: date.trim() || null, spots: Number(spots) || 0, description: desc.trim() || null, meetLat: meetCoord?.latitude ?? null, meetLng: meetCoord?.longitude ?? null, meetAt: meetAt.trim() || null });
      } else {
        success = await createChannel(token, { name: title.trim(), access, price: access === 'paid' ? price.trim() || null : null, bio: bio.trim() || null, avatarUrl: avatar || undefined });
      }
    } catch {
      // Сеть/токен упали до ответа сервера — это не «нет прав», говорим прямо.
      failed = true;
    }
    setBusy(false);
    // Return to the community home WITH a changing `refresh` token (reload lists)
    // AND `focus` = the created kind, so it opens the tab that actually shows it
    // (the home tab doesn't list open challenges) — otherwise the new item looks
    // like it "didn't appear".
    if (success) Alert.alert('Создано', 'Опубликовано и доступно в приложении.', [{ text: 'Готово', onPress: () => navigation.navigate('CommunityHome', { refresh: Date.now(), focus: kind }) }]);
    else if (failed) Alert.alert('Не удалось создать', 'Нет связи с сервером. Проверьте подключение к интернету и попробуйте снова.');
    else Alert.alert('Не удалось создать', 'Сервер отклонил запрос. Проверьте подключение — публиковать могут только кураторы сообщества.');
  };

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;
  const kindIndex = KINDS.findIndex((x) => x.k === kind);
  const accessIndex = ACCESS.findIndex((x) => x.k === access);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="Отмена"
          style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: 8, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text style={[ty.body, { color: T.brandText }]}>Отмена</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[ty.headline, { color: T.label }]} numberOfLines={1}>Создать</Text>
        <View style={{ width: 72 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <Segmented items={KINDS.map((x) => x.label)} value={kindIndex} onChange={(i) => setKind(KINDS[i]?.k ?? 'challenge')} />

          <Field label={kind === 'channel' ? 'Название канала' : 'Название'}>
            <TextInput value={title} onChangeText={setTitle} placeholder={kind === 'trip' ? 'напр. Кольсай и Каинды' : kind === 'sport' ? 'напр. Футбол по субботам' : kind === 'channel' ? 'напр. Women’s club' : 'напр. Divergents challenge'} placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Название" />
          </Field>

          {kind === 'challenge' ? (
            <>
              <Field label="Дата старта">
                <DateField value={chStart} onChange={setChStart} mode="date" placeholder="Выберите дату" />
              </Field>
              <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>Набор идёт до этой даты, затем челлендж стартует автоматически.</Text>
              <Field label="Длительность (дней)"><TextInput value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Длительность в днях" /></Field>
              <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>Длительность задаёт организатор. Минимум 14 дней (например, 14, 21, 30).</Text>
              <Field label="Цена (необязательно)"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 12 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Цена" /></Field>
              <Field label="Команды и капитаны">
                <Text style={[ty.caption1, { color: T.labelTertiary, marginBottom: 8, marginLeft: 4 }]}>Число справа — размер команды (сколько человек можно набрать). Задайте любой: 20, 30, 35…</Text>
                {chTeams.map((tm, i) => (
                  <View key={i} style={{ backgroundColor: T.cardBg, borderRadius: 12, padding: 12, marginBottom: 8, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput value={tm.name} onChangeText={(v) => setChTeams((p) => p.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="Название команды" placeholderTextColor={T.labelTertiary} style={[inp, { flex: 1 }]} accessibilityLabel={`Название команды ${i + 1}`} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput value={tm.capacity} onChangeText={(v) => setChTeams((p) => p.map((x, j) => (j === i ? { ...x, capacity: v.replace(/[^0-9]/g, '') } : x)))} keyboardType="number-pad" placeholder="30" placeholderTextColor={T.labelTertiary} style={[inp, { width: 60, textAlign: 'center' }]} accessibilityLabel={`Размер команды ${i + 1}`} />
                        <Text style={[ty.caption1, { color: T.labelSecondary }]}>чел.</Text>
                      </View>
                    </View>
                    <TextInput value={tm.captainEmail} onChangeText={(v) => setChTeams((p) => p.map((x, j) => (j === i ? { ...x, captainEmail: v } : x)))} placeholder="email капитана (необязательно)" placeholderTextColor={T.labelTertiary} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={inp} accessibilityLabel={`Email капитана команды ${i + 1}`} />
                    {chTeams.length > 1 ? (
                      <Pressable onPress={() => setChTeams((p) => p.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Удалить команду ${i + 1}`}
                        style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                        <Text style={[ty.caption1, { color: T.redText }]}>Удалить команду</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable onPress={() => setChTeams((p) => [...p, { name: '', capacity: '30', captainEmail: '' }])} accessibilityRole="button" accessibilityLabel="Добавить команду"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 }}>
                  <SF name="plus" size={14} color={T.brandText} /><Text style={[ty.subheadEm, { color: T.brandText }]}>Добавить команду</Text>
                </Pressable>
              </Field>
            </>
          ) : kind === 'trip' ? (
            <>
              <Field label="Регион"><TextInput value={region} onChangeText={setRegion} placeholder="напр. Алматинская область" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Регион" /></Field>
              <Field label="Дата (текстом)"><TextInput value={date} onChangeText={setDate} placeholder="напр. 12–14 июля" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Дата текстом" /></Field>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Дней"><TextInput value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Дней" /></Field></View>
                <View style={{ flex: 1 }}><Field label="Мест"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Мест" /></Field></View>
              </View>
              <Field label="Цена"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 45 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Цена" /></Field>
              <Field label="Сложность"><TextInput value={difficulty} onChangeText={setDifficulty} placeholder="напр. средняя" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Сложность" /></Field>
              <Field label="Место встречи"><TextInput value={meetPlace} onChangeText={setMeetPlace} placeholder="напр. у входа в парк" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Место встречи" /></Field>
              <Field label="Время встречи">
                <DateField value={meetAt} onChange={setMeetAt} mode="datetime" placeholder="Выберите дату и время" clearable />
              </Field>
              <Field label="Точка встречи на карте">
                <View style={{ borderRadius: 14, overflow: 'hidden', height: 180 }}>
                  <MapView style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? 43.238, longitude: meetCoord?.longitude ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor="#2f5bd6" /> : null}
                  </MapView>
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 6 }]}>{meetCoord ? 'Точка выбрана ✓ — нажмите, чтобы изменить' : 'Нажмите на карту, чтобы поставить точку встречи'}</Text>
              </Field>
              <Field label="Описание"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко о поездке" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} accessibilityLabel="Описание" /></Field>
            </>
          ) : kind === 'sport' ? (
            <>
              <Field label="Место"><TextInput value={place} onChangeText={setPlace} placeholder="напр. Манеж, Алматы" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Место" /></Field>
              <Field label="Дата (текстом)"><TextInput value={date} onChangeText={setDate} placeholder="напр. сб 10:00" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Дата текстом" /></Field>
              <Field label="Время встречи">
                <DateField value={meetAt} onChange={setMeetAt} mode="datetime" placeholder="Выберите дату и время" clearable />
              </Field>
              <Field label="Мест"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Мест" /></Field>
              <Field label="Описание"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} accessibilityLabel="Описание" /></Field>
              <Field label="Место на карте">
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
                <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel={avatar ? 'Изменить фото канала' : 'Добавить фото канала'} accessibilityState={{ busy: avBusy }}>
                  {avatar ? <Image source={{ uri: avatar }} style={{ width: 84, height: 84, borderRadius: 22 }} contentFit="cover" />
                    : <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={24} color={T.labelSecondary} /></View>}
                  <Text style={[ty.caption1, { color: T.brandText, textAlign: 'center', marginTop: 6 }]}>{avBusy ? 'Загрузка…' : 'Фото канала'}</Text>
                </Pressable>
              </View>
              <Field label="Тип доступа">
                <Segmented items={ACCESS.map((x) => x.label)} value={accessIndex} onChange={(i) => setAccess(ACCESS[i]?.k ?? 'open')} />
              </Field>
              {access === 'paid' ? <Field label="Цена"><TextInput value={price} onChangeText={setPrice} placeholder="напр. 500 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Цена" /></Field> : null}
              <Field label="Описание"><TextInput value={bio} onChangeText={setBio} multiline placeholder="О чём канал" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} accessibilityLabel="Описание канала" /></Field>
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

// Native date / date-time picker that keeps producing the plain strings the
// submit code expects ('ГГГГ-ММ-ДД' or 'ГГГГ-ММ-ДД ЧЧ:ММ'). iOS renders the
// compact inline control; Android opens the system dialogs on tap (date, then
// time for `datetime`, since Android has no combined picker).
function DateField({ value, onChange, mode, placeholder, clearable }: {
  value: string; onChange: (v: string) => void; mode: 'date' | 'datetime'; placeholder: string; clearable?: boolean;
}) {
  const { T, ty, isDark } = useTheme();
  const withTime = mode === 'datetime';
  const current = parseDateString(value) ?? new Date();
  const commit = (d: Date) => onChange(withTime ? fmtDateTime(d) : fmtDate(d));
  const label = value ? humanDate(value, withTime) || value : placeholder;

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: current, mode: 'date',
      onChange: (e: DateTimePickerEvent, picked?: Date) => {
        if (e.type !== 'set' || !picked) return;
        if (!withTime) { commit(picked); return; }
        DateTimePickerAndroid.open({
          value: picked, mode: 'time', is24Hour: true,
          onChange: (e2: DateTimePickerEvent, t?: Date) => {
            if (e2.type !== 'set' || !t) return;
            const d = new Date(picked);
            d.setHours(t.getHours(), t.getMinutes(), 0, 0);
            commit(d);
          },
        });
      },
    });
  };

  return (
    <View style={{ backgroundColor: T.cardBg, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SF name={withTime ? 'clock.fill' : 'calendar'} size={15} color={T.brandText} />
      {Platform.OS === 'ios' ? (
        <>
          <Text style={[ty.body, { color: value ? T.label : T.labelTertiary, flex: 1 }]} numberOfLines={1}>{label}</Text>
          <DateTimePicker
            value={current}
            mode={mode}
            display="compact"
            locale="ru-RU"
            themeVariant={isDark ? 'dark' : 'light'}
            accentColor={T.brand}
            onChange={(_e, picked) => { if (picked) commit(picked); }}
            accessibilityLabel={placeholder}
          />
        </>
      ) : (
        <Pressable onPress={openAndroid} accessibilityRole="button" accessibilityLabel={value ? `${placeholder}: ${label}` : placeholder}
          style={({ pressed }) => ({ flex: 1, minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text style={[ty.body, { color: value ? T.label : T.labelTertiary }]} numberOfLines={1}>{label}</Text>
        </Pressable>
      )}
      {clearable && value ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Очистить" hitSlop={8}
          style={{ minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <SF name="xmark.circle.fill" size={18} color={T.labelTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      {/* textTransform, а не ЗАГЛАВНЫЕ в строке: VoiceOver читает слова, а не буквы. */}
      <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.4 }]} numberOfLines={1}>{label}</Text>
      {children}
    </View>
  );
}
