import { Wrapper } from '../../components/Wrapper';
import { ContentBlock } from '../../components/ContentBlock';
import React, { useState, useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Alert, Keyboard, Platform } from 'react-native';
import { CommonActions, usePreventRemove } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CreationFormLayout } from '../../components/CreationFormLayout';
import { CreationField as Field } from '../../components/CreationField';
import { CreationTypePicker } from '../../components/CreationTypePicker';
import { CreationTextInput } from '../../components/CreationTextInput';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Button, Segmented } from '../../components/ui';
import { createChallenge, createTrip, createChannel, createSport, createMeetup, uploadFile, PostResult } from '../../data/api';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import MapView, { Marker } from 'react-native-maps';
import { CommunityStackParams } from '../../navigation/types';
import { validateOfflineEvent } from '../../data/offlineEventPolicy';
import { COUNTRIES } from '../../data/places';
import { useRole } from '../../state/useRole';
import { CreationSuccess, CreationKind } from '../../components/CreationSuccess';
import { hSuccess } from '../../lib/haptics';
import { fmtDateTime as formatDateTime } from '../../data/format';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateContent'>;
type Kind = CreationKind;
type Access = 'open' | 'request' | 'paid';

const KINDS: { k: Kind; label: string }[] = [
  { k: 'challenge', label: 'Челлендж' }, { k: 'trip', label: 'Поездка' }, { k: 'meetup', label: 'Мероприятие' }, { k: 'sport', label: 'Спорт' }, { k: 'channel', label: 'Канал' },
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
  return formatDateTime(d, withTime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
};

export function CreateContentScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const { isAdmin, has } = useRole();
  const kinds = KINDS.filter(x => x.k === 'challenge' ? isAdmin : x.k === 'channel' ? has('channels') : true);
  const submitLock = useRef(false);
  const publication = useRef({ fingerprint: '', id: '' });
  const [published, setPublished] = useState(false);
  const [createdId, setCreatedId] = useState<string | undefined>();
  const [kind, setKind] = useState<Kind>('meetup');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [days, setDays] = useState('21');
  const [price, setPrice] = useState('');
  // Challenge: start date (YYYY-MM-DD) + teams with an optional captain email.
  const [chStart, setChStart] = useState('');
  const [chTeams, setChTeams] = useState<{ name: string; capacity: string; captainEmail: string }[]>([
    { name: 'Команда А', capacity: '30', captainEmail: '' },
  ]);
  const [city, setCity] = useState('');
  const knownCities = COUNTRIES[0].cities;
  const selectedCity = knownCities.find(c => c.name.toLocaleLowerCase() === city.trim().toLocaleLowerCase() || c.key === city.trim().toLowerCase());
  const [tripDays, setTripDays] = useState('1');
  const [region, setRegion] = useState('');
  const [place, setPlace] = useState('');
  const [meetPlace, setMeetPlace] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [meetCoord, setMeetCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [spots, setSpots] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [desc, setDesc] = useState('');
  const [access, setAccess] = useState<Access>('open');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avBusy, setAvBusy] = useState(false);

  const ok = title.trim().length > 1;
  // Anything typed beyond the defaults → ask before discarding on «Отмена».
  const dirty = !!(city || tripDays !== '1' || title || price || chStart || region || place || meetPlace || meetAt || meetCoord || spots || difficulty || desc || bio || avatar
    || days !== '21' || chTeams.length !== 1 || chTeams[0]?.name !== 'Команда А' || chTeams[0]?.capacity !== '30' || chTeams[0]?.captainEmail);

  // Спрашиваем при любом уходе, а не только по кнопке «Отмена»: свайп от края
  // раньше уносил заполненную форму без вопроса.
  usePreventRemove((dirty || busy) && !published, ({ data }) => {
    if (submitLock.current) return;
    Alert.alert('Отменить создание?', 'Введённые данные не сохранятся.', [
      { text: 'Продолжить редактирование', style: 'cancel' },
      { text: 'Отменить', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const cancel = () => navigation.goBack();

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
    if (!ok || submitLock.current || published) return;
    if (!isSignedIn) { Alert.alert('Войдите в аккаунт', 'Создавать встречи могут авторизованные участники.'); return; }
    if (!kinds.some(x => x.k === kind)) { Alert.alert('Нет доступа'); return; }
    const offline = kind === 'trip' || kind === 'sport' || kind === 'meetup';
    const eventPayload = { title: title.trim(), city: city.trim(), description: desc.trim(), place: place.trim(), meetPlace: meetPlace.trim(), spots: Number(spots), days: Number(tripDays), meetAt: meetAt.trim(), meetLat: meetCoord?.latitude, meetLng: meetCoord?.longitude };
    const fingerprint = JSON.stringify({ kind, ...eventPayload, region, difficulty });
    if (publication.current.fingerprint !== fingerprint) publication.current = { fingerprint, id: Crypto.randomUUID() };
    const publishPayload = { ...eventPayload, creationId: publication.current.id };
    if (offline) {
      const error = validateOfflineEvent(kind, eventPayload);
      if (error) { Alert.alert('Проверьте данные встречи', error); return; }
    }
    submitLock.current = true;
    setBusy(true);
    let success = false;
    let failed = false;
    // Текст отказа от сервера. Пусто — значит сервер не объяснил, и тогда
    // показываем общую фразу.
    let denied: string | null = null;
    let res: PostResult | null = null;
    try {
      const token = await getToken();
      if (kind === 'challenge') {
        const s = chStart.trim();
        const startISO = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T09:00:00`).toISOString() : '';
        if (!startISO || isNaN(Date.parse(startISO))) { submitLock.current = false; setBusy(false); Alert.alert('Укажите дату старта', 'Выберите дату в поле «Дата старта».'); return; }
        const durationDays = Number(days) || 21;
        if (durationDays < 14) { submitLock.current = false; setBusy(false); Alert.alert('Слишком короткий челлендж', 'Минимальная длительность — 14 дней.'); return; }
        const teamsPayload = chTeams.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), capacity: Number(t.capacity) || 30, captainEmail: t.captainEmail.trim() || undefined }));
        if (teamsPayload.length === 0) { submitLock.current = false; setBusy(false); Alert.alert('Добавьте хотя бы одну команду'); return; }
        res = await createChallenge(token, { title: title.trim(), startISO, durationDays, price: price.trim() || null, teams: teamsPayload });
      } else if (kind === 'trip') {
        res = await createTrip(token, { ...publishPayload, region: region.trim() || null, difficulty: difficulty.trim() || null, price: "Бесплатно" });
      } else if (kind === 'sport') {
        res = await createSport(token, publishPayload);
      } else if (kind === 'meetup') {
        res = await createMeetup(token, { ...publishPayload, price: "Бесплатно" });
      } else {
        res = await createChannel(token, { name: title.trim(), access, price: access === 'paid' ? price.trim() || null : null, bio: bio.trim() || null, avatarUrl: avatar || undefined });
      }
      success = res?.ok === true;
      if (res && !res.ok) {
        // Сети не было вовсе — это не отказ сервера, и говорить о правах нельзя.
        if (res.status === 0) failed = true;
        else denied = res.message ?? null;
      }
    } catch {
      // Сеть/токен упали до ответа сервера — это не «нет прав», говорим прямо.
      failed = true;
    }
    submitLock.current = false;
    setBusy(false);
    if (success) {
      Keyboard.dismiss();
      setCreatedId(res?.createdId);
      setPublished(true);
      hSuccess();
      // Also refresh on swipe/system Back, not only on the two result buttons.
      const home = navigation.getState().routes.find(r => r.name === 'CommunityHome');
      if (home) navigation.dispatch({ ...CommonActions.setParams({ refresh: Date.now(), focus: kind }), source: home.key });
    }
    else if (failed) Alert.alert('Не удалось создать', 'Нет связи с сервером. Проверьте подключение к интернету и попробуйте снова.');
    else if (denied) Alert.alert('Не удалось создать', denied);
    else Alert.alert('Не удалось создать', 'Сервер отклонил запрос. Попробуйте ещё раз.');
  };

  const closeResult = () => navigation.popTo('CommunityHome', { refresh: Date.now(), focus: kind });
  const openResult = () => {
    if (!createdId) { closeResult(); return; }
    // Replace the completed form, so Back cannot submit the same publication.
    switch (kind) {
      case 'challenge': navigation.replace('ChallengeDetail', { challengeId: createdId }); break;
      case 'trip': navigation.replace('TripDetail', { tripId: createdId }); break;
      case 'meetup': navigation.replace('MeetupDetail', { meetupId: createdId }); break;
      case 'sport': navigation.replace('SportDetail', { sportId: createdId }); break;
      case 'channel': navigation.replace('ServerChannel', { channelId: createdId }); break;
    }
  };

  if (published) {
    const offline = kind === 'trip' || kind === 'sport' || kind === 'meetup';
    return <CreationSuccess kind={kind} title={title.trim()}
      dateLabel={kind === 'challenge' ? humanDate(chStart, false) : offline ? humanDate(meetAt, true) : undefined}
      locationLabel={offline ? [city.trim(), meetPlace.trim() || place.trim()].filter(Boolean).join(' · ') : undefined}
      coordinate={offline ? meetCoord ?? undefined : undefined}
      summary={kind === 'challenge' ? `Длительность: ${Number(days) || 21} дн.` : offline ? 'Участие бесплатно' : undefined}
      destination={createdId ? 'detail' : 'collection'} onOpen={openResult} onClose={closeResult} />;
  }

  const inp = { backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body } as any;

  const accessIndex = ACCESS.findIndex((x) => x.k === access);

  return (
    <CreationFormLayout onCancel={cancel} onSubmit={submit} busy={busy} disabled={!ok || published || !isSignedIn}>
          <CreationTypePicker options={kinds.map(x => ({ key: x.k, label: x.label }))} value={kind} onChange={value => setKind(value as Kind)} disabled={busy || published} />
          {kind !== 'challenge' && kind !== 'channel' ? <>
            <Wrapper marginTop={16}><ContentBlock size="regular">
              <Text style={[ty.headline, { color: T.brandText }]}>Бесплатная встреча</Text>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6 }]}>Участники отправляют заявки, а вы выбираете, кого принять. Организатор видит публичные имена; анкеты и контакты доступны только администраторам.</Text>
            </ContentBlock></Wrapper>

          </> : null}

          <Field label={kind === 'channel' ? 'Название канала' : 'Название'}>
            <CreationTextInput value={title} onChange={setTitle} disabled={busy} placeholder={kind === 'trip' ? 'напр. Кольсай и Каинды' : kind === 'meetup' ? 'напр. Кинопоказ и разбор' : kind === 'sport' ? 'напр. Футбол по субботам' : kind === 'channel' ? 'напр. Women’s club' : 'напр. Divergents challenge'} label="Название" />
          </Field>

          {kind !== 'challenge' && kind !== 'channel' ? <>
            <Field label="Город · обязательно"><TextInput value={city} onChangeText={v => { setCity(v); setMeetCoord(null); }} maxLength={100} placeholder="Например, Алматы" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Город встречи" /></Field>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
              {knownCities.filter(c => !city || c.name.toLocaleLowerCase().startsWith(city.trim().toLocaleLowerCase())).slice(0, 5).map(c =>
                <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={`Выбрать город ${c.name}`} onPress={() => { setCity(c.name); setMeetCoord(null); }}
                  style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 24, backgroundColor: T.cardBg, justifyContent: 'center' }}>
                  <Text style={[ty.subhead, { color: T.brandText }]}>{c.name}</Text>
                </Pressable>)}
            </ScrollView>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 8 }]}>Время — по Казахстану (UTC+5). Адрес, описание, количество участников и точка на карте обязательны. Количество мест — для гостей, без организатора.</Text>
          </> : null}

          {kind === 'challenge' ? (
            <>
              {process.env.EXPO_PUBLIC_READING_CHALLENGES === 'true' ? <Wrapper marginVertical={12}>
                <Button label="Создать читательский челлендж" variant="tinted" onPress={() => navigation.navigate('CreateReadingChallenge')} />
              </Wrapper> : null}
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
                  <Wrapper marginBottom={8} key={i}><ContentBlock size="compact"><Wrapper gap={8}>
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
                  </Wrapper></ContentBlock></Wrapper>
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Дней"><TextInput value={tripDays} onChangeText={(t) => setTripDays(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Дней" /></Field></View>
                <View style={{ flex: 1 }}><Field label="Мест"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Мест" /></Field></View>
              </View>
              <Field label="Сложность"><TextInput value={difficulty} onChangeText={setDifficulty} placeholder="напр. средняя" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Сложность" /></Field>
              <Field label="Место встречи"><TextInput value={meetPlace} onChangeText={setMeetPlace} placeholder="напр. у входа в парк" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Место встречи" /></Field>
              <Field label="Время встречи · обязательно">
                <DateField value={meetAt} onChange={setMeetAt} mode="datetime" placeholder="Выберите дату и время" clearable />
              </Field>
              <Field label="Точка встречи на карте">
                <View style={{ borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', height: 240 }}>
                  <MapView key={selectedCity?.key ?? 'custom'} testID="meeting-map" accessibilityLabel="Нажмите на карту для выбора места встречи" style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? selectedCity?.lat ?? 43.238, longitude: meetCoord?.longitude ?? selectedCity?.lng ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor={T.brand} /> : null}
                  </MapView>
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 6 }]}>{meetCoord ? 'Точка выбрана ✓ — нажмите, чтобы изменить' : 'Нажмите на карту, чтобы поставить точку встречи'}</Text>
              </Field>
              <Field label="Описание"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко о поездке" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 90, textAlignVertical: 'top' }]} accessibilityLabel="Описание" /></Field>
            </>
          ) : kind === 'meetup' ? (
            <>
              {/* Мероприятие — встреча, а не поход: региона, числа дней и
                  сложности здесь нет. Описание обязательное по смыслу: без него
                  человек не поймёт, на что записывается. */}
              <Field label="Место"><TextInput value={place} onChangeText={setPlace} placeholder="напр. Кофейня Sreda, Астана" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Место" /></Field>
              <Field label="Начало">
                <DateField value={meetAt} onChange={setMeetAt} mode="datetime" placeholder="Выберите дату и время" clearable />
              </Field>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Field label="Мест"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Мест" /></Field></View>
              </View>
              <Field label="Описание">
                <TextInput value={desc} onChangeText={setDesc} multiline placeholder="О чём встреча, для кого, что взять с собой" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 110, textAlignVertical: 'top' }]} accessibilityLabel="Описание" />
              </Field>
              <Field label="Место на карте">
                <View style={{ borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', height: 240 }}>
                  <MapView key={selectedCity?.key ?? 'custom'} testID="meeting-map" accessibilityLabel="Нажмите на карту для выбора места встречи" style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? selectedCity?.lat ?? 43.238, longitude: meetCoord?.longitude ?? selectedCity?.lng ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor={T.brand} /> : null}
                  </MapView>
                </View>
                <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 6 }]}>{meetCoord ? 'Точка выбрана ✓ — нажмите, чтобы изменить' : 'Нажмите на карту, чтобы поставить точку'}</Text>
              </Field>
            </>
          ) : kind === 'sport' ? (
            <>
              <Field label="Место"><TextInput value={place} onChangeText={setPlace} placeholder="напр. Манеж, Алматы" placeholderTextColor={T.labelTertiary} style={inp} accessibilityLabel="Место" /></Field>
              <Field label="Время встречи · обязательно">
                <DateField value={meetAt} onChange={setMeetAt} mode="datetime" placeholder="Выберите дату и время" clearable />
              </Field>
              <Field label="Мест"><TextInput value={spots} onChangeText={(t) => setSpots(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={inp} accessibilityLabel="Мест" /></Field>
              <Field label="Описание"><TextInput value={desc} onChangeText={setDesc} multiline placeholder="Кратко" placeholderTextColor={T.labelTertiary} style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} accessibilityLabel="Описание" /></Field>
              <Field label="Место на карте">
                <View style={{ borderRadius: 14, borderCurve: 'continuous', overflow: 'hidden', height: 240 }}>
                  <MapView key={selectedCity?.key ?? 'custom'} testID="meeting-map" accessibilityLabel="Нажмите на карту для выбора места встречи" style={{ flex: 1 }} initialRegion={{ latitude: meetCoord?.latitude ?? selectedCity?.lat ?? 43.238, longitude: meetCoord?.longitude ?? selectedCity?.lng ?? 76.889, latitudeDelta: 0.06, longitudeDelta: 0.06 }} onPress={(e) => setMeetCoord(e.nativeEvent.coordinate)}>
                    {meetCoord ? <Marker coordinate={meetCoord} pinColor={T.brand} /> : null}
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
                    : <View style={{ width: 84, height: 84, borderRadius: 22, borderCurve: 'continuous', backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center' }}><SF name="photo" size={24} color={T.labelSecondary} /></View>}
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
    </CreationFormLayout>
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
    <View style={{ backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
