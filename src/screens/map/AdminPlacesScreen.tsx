// Admin/curator (xaaknazar@gmail.com): the approval queue for user-suggested
// places. Approve → the marker becomes public on the map; reject → it's deleted.
// The list of pending suggestions is the "список на карте" for moderation.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import { usePlaces } from '../../state/PlacesContext';
import { useRole } from '../../state/useRole';
import { tr } from '../../state/LanguageContext';
import { fetchPendingPlaces, approvePlace, rejectPlace, PendingPlace, CATEGORY_META, TAG_META, COUNTRIES, cityCenter } from '../../data/places';
import { MapStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MapStackParams, 'AdminPlaces'>;

export function AdminPlacesScreen({ navigation }: Props) {
  const { T } = useTheme();
  const { getToken } = useAuth();
  const { canCreate: canModerate } = useRole();
  const { reloadPlaces } = usePlaces();
  const [items, setItems] = useState<PendingPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      setItems(await fetchPendingPlaces(token));
    } finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { load(); }, [load]);

  const approve = async (p: PendingPlace) => {
    setBusyId(p.id);
    const token = await getToken();
    const ok = await approvePlace(token, p.id, true);
    setBusyId(null);
    if (!ok) { Alert.alert(tr('Ошибка'), tr('Не удалось одобрить. Попробуйте ещё раз.')); return; }
    hSuccess();
    setItems((prev) => prev.filter((x) => x.id !== p.id));
    reloadPlaces();
  };

  const reject = (p: PendingPlace) => {
    Alert.alert(tr('Отклонить метку?'), `«${p.name}» — ${tr('будет удалена безвозвратно.')}`, [
      { text: tr('Отмена'), style: 'cancel' },
      { text: tr('Отклонить'), style: 'destructive', onPress: async () => {
        setBusyId(p.id);
        const token = await getToken();
        const ok = await rejectPlace(token, p.id);
        setBusyId(null);
        if (!ok) { Alert.alert(tr('Ошибка'), tr('Не удалось отклонить. Попробуйте ещё раз.')); return; }
        setItems((prev) => prev.filter((x) => x.id !== p.id));
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Заявки на метки')} backLabel={tr('Карта')} onBack={() => navigation.goBack()} hairline />
      {!canModerate ? (
        <EmptyState icon="lock.fill" title={tr('Нет доступа')} subtitle={tr('Модерация меток доступна только администратору.')} />
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      ) : items.length === 0 ? (
        <EmptyState icon="checkmark.seal.fill" title={tr('Заявок нет')} subtitle={tr('Новые предложенные метки появятся здесь на одобрение.')} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 30 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]} numberOfLines={1}>{tr('На модерации')} · {items.length}</Text>
          {items.map((p) => {
            const meta = CATEGORY_META[p.category];
            const cityName = cityCenter(p.country, p.city)?.name ?? p.city;
            const countryName = COUNTRIES.find((c) => c.key === p.country)?.name ?? p.country;
            const busy = busyId === p.id;
            return (
              <View key={p.id} style={{ backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder, overflow: 'hidden' }}>
                {p.photo ? <Image source={{ uri: p.photo }} style={{ width: '100%', height: 130 }} contentFit="cover" /> : null}
                <View style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <SF name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{meta.label} · {cityName}, {countryName}</Text>
                    </View>
                  </View>

                  {p.highlights ? <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={3}>{p.highlights}</Text> : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {p.hours ? <Capsule bg={T.fillTertiary} color={T.label}><SF name="clock.fill" size={10} color={T.labelSecondary} />{p.hours}</Capsule> : null}
                    {p.tags.slice(0, 4).map((tg) => <Capsule key={tg} bg={T.brandTinted} color={T.brand}><SF name={TAG_META[tg].icon} size={10} color={T.brand} />{TAG_META[tg].label}</Capsule>)}
                  </View>

                  <Text style={[ty.caption2, { color: T.labelTertiary }]} numberOfLines={1}>
                    {tr('Предложил:')} {p.submitterName || p.addedBy || tr('Участник')}{p.submitterEmail ? ` · ${p.submitterEmail}` : ''}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Pressable onPress={() => reject(p)} disabled={busy} style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,59,48,0.12)' }}>
                      <Text style={[ty.headline, { color: '#FF3B30' }]} numberOfLines={1}>{tr('Отклонить')}</Text>
                    </Pressable>
                    <Pressable onPress={() => approve(p)} disabled={busy} style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.brand }}>
                      {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]} numberOfLines={1}>{tr('Одобрить')}</Text>}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
