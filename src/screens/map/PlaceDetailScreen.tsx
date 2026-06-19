import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, PrimaryButton, ty } from '../../components/ui';
import { Stars } from '../../components/Stars';
import { BackNav } from '../../components/headers';
import { usePlaces, ratingOf } from '../../state/PlacesContext';
import { CATEGORY_META, TAG_META } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'PlaceDetail'>;

export function PlaceDetailScreen({ route, navigation }: Props) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { getPlace, addReview } = usePlaces();
  const place = getPlace(route.params.placeId);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');

  if (!place) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back="Места" onBack={() => navigation.goBack()} />
        <View style={{ padding: 30, alignItems: 'center' }}><Text style={[ty.subhead, { color: T.labelSecondary }]}>Место не найдено</Text></View>
      </View>
    );
  }

  const meta = CATEGORY_META[place.category];
  const r = ratingOf(place);

  const submit = () => {
    if (!stars) return;
    const author = user?.firstName || user?.fullName || (user?.primaryEmailAddress?.emailAddress?.split('@')[0]) || 'Участник';
    addReview(place.id, { author, rating: stars, text: text.trim() });
    setStars(0); setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Места" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
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
          <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', marginBottom: 6 }]}>Чем хорошо</Text>
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
          <Text style={[ty.headline, { color: T.brand }]}>Открыть на карте</Text>
        </Pressable>

        {/* Reviews */}
        <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingBottom: 8 }]}>Отзывы · {place.reviews.length}</Text>
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
          <Text style={[ty.subhead, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 8 }]}>Пока нет отзывов — оставь первый.</Text>
        ) : null}

        {/* Add review */}
        {isSignedIn ? (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: T.cardBg, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
            <Text style={[ty.headline, { color: T.label, marginBottom: 10 }]}>Ваш отзыв</Text>
            <Stars value={stars} size={28} onChange={setStars} />
            <TextInput value={text} onChangeText={setText} placeholder="Чем понравилось / что улучшить" placeholderTextColor={T.labelTertiary} multiline
              style={[ty.body, { backgroundColor: T.fillTertiary, borderRadius: 12, padding: 12, color: T.label, minHeight: 70, textAlignVertical: 'top', marginTop: 12 }]} />
            <PrimaryButton label="Отправить отзыв" icon="paperplane.fill" style={{ marginTop: 12 }} disabled={!stars} onPress={submit} />
          </View>
        ) : (
          <Pressable onPress={() => navigation.getParent()?.getParent()?.navigate('Auth' as never)}
            style={{ marginHorizontal: 16, marginTop: 8, padding: 14, backgroundColor: T.brandTinted, borderRadius: 14, alignItems: 'center' }}>
            <Text style={[ty.subheadEm, { color: T.brand }]}>Войдите, чтобы оставить отзыв</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
