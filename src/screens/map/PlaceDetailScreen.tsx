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
import { Capsule, PrimaryButton } from '../../components/ui';
import { Stars } from '../../components/Stars';
import { NavHeader } from '../../components/NavHeader';
import { usePlaces, ratingOf } from '../../state/PlacesContext';
import { useModeration } from '../../state/ModerationContext';
import { CATEGORY_META, TAG_META, isOpenNow, reportPlace, postReview, updatePlaceReview, deletePlaceReview } from '../../data/places';
import { MapStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<MapStackParams, 'PlaceDetail'>;

// Soft neutral blur shown instantly while the real photo streams in from the
// CDN — the page never flashes an empty block, so the image feels much faster.
const PHOTO_BLURHASH = 'L6Pj0^i_.AyE_3t7t7R**0o#DgR4';

export function PlaceDetailScreen({ route, navigation }: Props) {
  const { T, isDark, ty } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { getPlace, addReview, isFav, toggleFav, reloadPlaces } = usePlaces();
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const { isBlocked, block } = useModeration();
  const place = getPlace(route.params.placeId);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState(false);

  // UGC moderation (App Store 1.2): report a review or block its author. The
  // report really goes to moderators through the place's report endpoint (the
  // reason encodes the review id) — no fake «спасибо» when nothing was sent.
  const moderateReview = (rev: { id: string; author: string }) => {
    Alert.alert(rev.author, tr('Пожаловаться на отзыв или скрыть автора?'), [
      { text: tr('Пожаловаться'), onPress: () => {
        if (!isSignedIn) { Alert.alert(tr('Войдите в аккаунт'), tr('Чтобы пожаловаться на отзыв, войдите в аккаунт Divergents.')); return; }
        sendReport(`review:${rev.id}`);
      } },
      { text: tr('Заблокировать автора'), style: 'destructive', onPress: () => { block(rev.author); Alert.alert(tr('Автор заблокирован'), tr('Его отзывы и записи скрыты для вас.')); } },
      { text: tr('Отмена'), style: 'cancel' },
    ]);
  };

  if (!place) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Места')} onBack={() => navigation.goBack()} />
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

  // Edit / delete your own review (server-backed; refreshes the shared list).
  const startEditReview = (rev: { id: string; rating: number; text: string }) => {
    setEditingReview(rev.id);
    setStars(rev.rating);
    setText(rev.text);
  };
  const cancelEditReview = () => { setEditingReview(null); setStars(0); setText(''); };
  const confirmDeleteReview = (rev: { id: string }) => {
    Alert.alert(tr('Удалить отзыв?'), undefined, [
      { text: tr('Отмена'), style: 'cancel' },
      { text: tr('Удалить'), style: 'destructive', onPress: async () => {
        const token = await getToken();
        const ok = await deletePlaceReview(place.id, rev.id, token);
        if (ok) { if (editingReview === rev.id) { setEditingReview(null); setStars(0); setText(''); } reloadPlaces(); }
        else Alert.alert(tr('Не удалось удалить'), tr('Проверьте подключение и попробуйте снова.'));
      } },
    ]);
  };

  const submit = () => {
    if (!stars) return;
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Участник';
    const rating = stars;
    const body = text.trim();
    if (editingReview) {
      const id = editingReview;
      setEditingReview(null); setStars(0); setText('');
      (async () => {
        const token = await getToken();
        const ok = await updatePlaceReview(place.id, id, { rating, text: body }, token);
        if (ok) reloadPlaces();
        else Alert.alert(tr('Не удалось сохранить'), tr('Проверьте подключение и попробуйте снова.'));
      })();
      return;
    }
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
      {/* No photo hero → the bar would be blank; name the screen in the title. */}
      <NavHeader title={place.photo ? undefined : place.name} backLabel={tr('Места')} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {place.photo ? (
          <Image
            source={{ uri: place.photo }}
            style={{ width: '100%', height: 220, backgroundColor: T.fillTertiary }}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
            priority="high"
            placeholder={PHOTO_BLURHASH}
            placeholderContentFit="cover"
          />
        ) : null}
        {/* Hero */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <SF name={meta.icon} size={28} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[ty.title2, { color: T.label }]} numberOfLines={2}>{place.name}</Text>
                {place.approved ? <SF name="checkmark.seal.fill" size={18} color={T.sky} /> : null}
              </View>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{meta.label} · {place.hours}</Text>
              {open.known ? <Text style={[ty.caption1, { color: open.open ? T.greenText : T.redText, marginTop: 2 }]} numberOfLines={1}>{open.label}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {r > 0 ? <Text style={[ty.title1, { color: T.label }]} numberOfLines={1}>{r.toFixed(1)}</Text> : null}
            <View style={{ flexShrink: 1 }}>
              <Stars value={r} size={16} />
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{pl.count(place.reviews.length, 'отзыв', 'отзыва', 'отзывов')} · добавил {place.addedBy}</Text>
            </View>
          </View>
          {place.approved ? (
            <View style={{ marginTop: 10 }}>
              <Capsule bg={T.skyBadgeBg} color={T.sky}><SF name="checkmark.seal.fill" size={11} color={T.sky} />{tr('Одобрено Divergents')}</Capsule>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <ActBtn icon={fav ? 'heart.fill' : 'heart'} label={fav ? tr('В избранном') : tr('В избранное')} active={fav} onPress={() => toggleFav(place.id)} T={T} />
            <ActBtn icon="square.and.arrow.up" label={tr('Поделиться')} onPress={sharePlace} T={T} />
            {mine ? <ActBtn icon="square.and.pencil" label={tr('Изменить')} onPress={() => navigation.navigate('AddPlace', { editId: place.id })} T={T} />
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
          <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', marginBottom: 6 }]} numberOfLines={1}>{tr('Чем хорошо')}</Text>
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
        <Pressable onPress={() => Linking.openURL(`https://2gis.kz/geo/${place.lng},${place.lat}`)} accessibilityRole="link" accessibilityLabel={tr('Открыть на карте')}
          style={{ marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 12, backgroundColor: T.brandTinted }}>
          <SF name="map.fill" size={15} color={T.brandText} />
          <Text style={[ty.headline, { color: T.brandText }]} numberOfLines={1}>{tr('Открыть на карте')}</Text>
        </Pressable>

        {/* Reviews (blocked authors filtered out) */}
        {(() => {
          const visibleReviews = place.reviews.filter((r) => !isBlocked(r.author));
          return (
            <>
              <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingBottom: 8 }]} numberOfLines={1}>{tr('Отзывы')} · {visibleReviews.length}</Text>
              {visibleReviews.map((rev) => (
                <View key={rev.id} style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: T.cardBg, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[ty.subheadEm, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{rev.author}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>{rev.date}</Text>
                      <Pressable onPress={() => moderateReview(rev)} accessibilityRole="button" accessibilityLabel={tr('Пожаловаться или заблокировать')}
                        style={{ width: 44, height: 44, marginVertical: -12, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
                        <SF name="ellipsis" size={16} color={T.labelTertiary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ marginTop: 4 }}><Stars value={rev.rating} size={12} /></View>
                  {rev.text ? <Text style={[ty.body, { color: T.label, marginTop: 6 }]}>{rev.text}</Text> : null}
                  {/* Own review: edit or delete it. */}
                  {rev.mine ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable onPress={() => startEditReview(rev)} accessibilityRole="button" accessibilityLabel={tr('Изменить отзыв')}
                        style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingRight: 8, opacity: pressed ? 0.5 : 1 })}>
                        <Text style={[ty.footnoteEm, { color: T.brandText }]}>{tr('Изменить')}</Text>
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteReview(rev)} accessibilityRole="button" accessibilityLabel={tr('Удалить отзыв')}
                        style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8, opacity: pressed ? 0.5 : 1 })}>
                        <Text style={[ty.footnoteEm, { color: T.redText }]}>{tr('Удалить')}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
              {visibleReviews.length === 0 ? (
                <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 8 }]}>{tr('Пока нет отзывов — оставьте первый.')}</Text>
              ) : null}
            </>
          );
        })()}

        {/* Add review */}
        {isSignedIn ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{editingReview ? tr('Изменить отзыв') : tr('Ваш отзыв')}</Text>
              {editingReview ? (
                <Pressable onPress={cancelEditReview} accessibilityRole="button" accessibilityLabel={tr('Отменить редактирование')}
                  style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end', marginVertical: -10, opacity: pressed ? 0.5 : 1 })}>
                  <Text style={[ty.footnoteEm, { color: T.brandText }]}>{tr('Отмена')}</Text>
                </Pressable>
              ) : null}
            </View>
            <Stars value={stars} size={28} onChange={setStars} />
            <TextInput value={text} onChangeText={setText} placeholder={tr('Чем понравилось / что улучшить')} placeholderTextColor={T.labelTertiary} multiline
              accessibilityLabel={tr('Текст отзыва')}
              style={[ty.body, { backgroundColor: T.fillTertiary, borderRadius: 12, padding: 12, color: T.label, minHeight: 70, textAlignVertical: 'top', marginTop: 12 }]} />
            <PrimaryButton label={editingReview ? tr('Сохранить отзыв') : tr('Отправить отзыв')} icon={editingReview ? 'checkmark' : 'paperplane.fill'} style={{ marginTop: 12 }} disabled={!stars} onPress={submit} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}


function ActBtn({ icon, label, active, onPress, T }: { icon: any; label: string; active?: boolean; onPress: () => void; T: any }) {
  const { ty } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({ flex: 1, minHeight: 62, borderRadius: 14, backgroundColor: active ? T.brandTinted : T.cardBg, borderWidth: 0.5, borderColor: active ? 'transparent' : T.cardBorder, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, opacity: pressed ? 0.7 : 1 })}>
      <SF name={icon} size={20} color={active ? T.brandText : T.label} />
      <Text style={[ty.caption1, { color: active ? T.brandText : T.labelSecondary }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
