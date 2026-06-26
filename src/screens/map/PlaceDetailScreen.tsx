import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, Linking, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, PrimaryButton, ty } from '../../components/ui';
import { Stars } from '../../components/Stars';
import { BackNav } from '../../components/headers';
import { usePlaces, ratingOf } from '../../state/PlacesContext';
import { CATEGORY_META, TAG_META, isOpenNow, reportPlace, postReview } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'PlaceDetail'>;

export function PlaceDetailScreen({ route, navigation }: Props) {
  const { T, isDark } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { getPlace, addReview, isFav, toggleFav } = usePlaces();
  const place = getPlace(route.params.placeId);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState(false);

  if (!place) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back={tr('Места')} onBack={() => navigation.goBack()} />
        <View style={{ padding: 30, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Место не найдено')}</Text></View>
      </View>
    );
  }

  const meta = CATEGORY_META[place.category];
  const r = ratingOf(place);
  const open = isOpenNow(place.hours);
  const mine = place.id.startsWith('u_');
  const fav = isFav(place.id);
  const sharePlace = () => Share.share({ message: `${place.name} — ${meta.label}\n${place.highlights}\nhttps://2gis.kz/geo/${place.lng},${place.lat}` });

  // Real report: requires sign-in, sends the chosen reason to moderators and
  // reports the outcome honestly (no fake "thanks" when nothing was sent).
  const sendReport = async (reason: string) => {
    if (reporting) return;
    setReporting(true);
    try {
      const token = await getToken().catch(() => null);
      const okSent = await reportPlace(place.id, reason, token);
      if (okSent) {
        Alert.alert(tr('Спасибо'), tr('Передали модераторам Divergents.'));
      } else {
        Alert.alert(tr('Не удалось отправить'), tr('Попробуйте позже или проверьте соединение.'));
      }
    } finally {
      setReporting(false);
    }
  };
  const report = () => {
    if (!isSignedIn) {
      Alert.alert(tr('Войдите в аккаунт'), tr('Чтобы сообщить о проблеме, войдите в аккаунт Divergents.'));
      return;
    }
    Alert.alert(tr('Сообщить о проблеме'), `«${place.name}»`, [
      { text: tr('Закрыто / не существует'), onPress: () => sendReport('closed_or_missing') },
      { text: tr('Неверные данные'), onPress: () => sendReport('wrong_info') },
      { text: tr('Отмена'), style: 'cancel' },
    ]);
  };

  const submit = () => {
    if (!stars) return;
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Участник';
    const rating = stars;
    const body = text.trim();
    // Optimistic local review (persists on-device) + best-effort server sync so
    // other users can see it. A sync failure is silent — the local copy stays.
    addReview(place.id, { author, rating, text: body });
    setStars(0); setText('');
    (async () => {
      try { const token = await getToken(); await postReview(place.id, { rating, text: body }, token); } catch {}
    })();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Места')} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {place.photo ? <Image source={{ uri: place.photo }} style={{ width: '100%', height: 200 }} contentFit="cover" /> : null}
        {/* Hero */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <SF name={meta.icon} size={28} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[ty.title2, { color: T.label }]} numberOfLines={2}>{place.name}</Text>
                {place.approved ? <SF name="checkmark.seal.fill" size={18} color="#0EA5E9" /> : null}
              </View>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{meta.label} · {place.hours}</Text>
              {open.known ? <Text style={[ty.caption1, { color: open.open ? '#16A34A' : '#EF4444', marginTop: 2 }]}>{open.label}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {r > 0 ? <Text style={[ty.title1, { color: T.label }]}>{r.toFixed(1)}</Text> : null}
            <View>
              <Stars value={r} size={16} />
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]}>{place.reviews.length} отзывов · добавил {place.addedBy}</Text>
            </View>
          </View>
          {place.approved ? (
            <View style={{ marginTop: 10 }}>
              <Capsule bg="rgba(14,165,233,0.14)" color="#0EA5E9"><SF name="checkmark.seal.fill" size={11} color="#0EA5E9" />Divergents Approved</Capsule>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <ActBtn icon={fav ? 'heart.fill' : 'heart'} label={fav ? 'В избранном' : 'В избранное'} active={fav} onPress={() => toggleFav(place.id)} T={T} />
            <ActBtn icon="square.and.arrow.up" label={tr('Поделиться')} onPress={sharePlace} T={T} />
            {mine ? <ActBtn icon="pencil" label={tr('Изменить')} onPress={() => navigation.navigate('AddPlace', { editId: place.id })} T={T} />
                  : <ActBtn icon="exclamationmark.bubble" label={tr('Сообщить')} onPress={report} T={T} />}
          </View>
        </View>

        {place.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 14 }}>
            {place.tags.map((t) => (
              <Capsule key={t} bg={T.brandTinted} color={T.brand}><SF name={TAG_META[t].icon} size={11} color={T.brand} />{TAG_META[t].label}</Capsule>
            ))}
          </View>
        ) : null}

        {/* Highlights */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', marginBottom: 6 }]}>{tr('Чем хорошо')}</Text>
          <Text style={[ty.body, { color: T.label }]}>{place.highlights}</Text>
        </View>

        {/* Map */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', height: 150 }}>
          <MapView style={{ flex: 1 }} pointerEvents="none"
            initialRegion={{ latitude: place.lat, longitude: place.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}>
            <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} pinColor={meta.color} />
          </MapView>
        </View>
        <Pressable onPress={() => Linking.openURL(`https://2gis.kz/geo/${place.lng},${place.lat}`)}
          style={{ marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, backgroundColor: T.brandTinted }}>
          <SF name="map.fill" size={15} color={T.brand} />
          <Text style={[ty.headline, { color: T.brand }]}>{tr('Открыть на карте')}</Text>
        </Pressable>

        {/* Reviews */}
        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingBottom: 8 }]}>{tr('Отзывы')} · {place.reviews.length}</Text>
        {place.reviews.map((rev) => (
          <View key={rev.id} style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: T.cardBg, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[ty.subheadEm, { color: T.label }]}>{rev.author}</Text>
              <Text style={[ty.caption2, { color: T.labelTertiary }]}>{rev.date}</Text>
            </View>
            <View style={{ marginTop: 4 }}><Stars value={rev.rating} size={12} /></View>
            {rev.text ? <Text style={[ty.body, { color: T.label, marginTop: 6 }]}>{rev.text}</Text> : null}
          </View>
        ))}
        {place.reviews.length === 0 ? (
          <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 8 }]}>{tr('Пока нет отзывов — оставь первый.')}</Text>
        ) : null}

        {/* Add review */}
        {isSignedIn ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
            <Text style={[ty.headline, { color: T.label, marginBottom: 10 }]}>{tr('Ваш отзыв')}</Text>
            <Stars value={stars} size={28} onChange={setStars} />
            <TextInput value={text} onChangeText={setText} placeholder={tr('Чем понравилось / что улучшить')} placeholderTextColor={T.labelTertiary} multiline
              style={[ty.body, { backgroundColor: T.fillTertiary, borderRadius: 12, padding: 12, color: T.label, minHeight: 70, textAlignVertical: 'top', marginTop: 12 }]} />
            <PrimaryButton label={tr('Отправить отзыв')} icon="paperplane.fill" style={{ marginTop: 12 }} disabled={!stars} onPress={submit} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}


function ActBtn({ icon, label, active, onPress, T }: { icon: any; label: string; active?: boolean; onPress: () => void; T: any }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 58, borderRadius: 14, backgroundColor: active ? T.brandTinted : T.cardBg, borderWidth: 0.5, borderColor: active ? 'transparent' : T.cardBorder, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <SF name={icon} size={18} color={active ? T.brand : T.label} />
      <Text style={[ty.caption2, { color: active ? T.brand : T.labelSecondary }]}>{label}</Text>
    </Pressable>
  );
}
