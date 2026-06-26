import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { ty } from '../../components/ui';
import { BackNav } from '../../components/headers';
import { usePlaces, filterPlaces } from '../../state/PlacesContext';
import { CATEGORY_META, cityCenter } from '../../data/places';
import { MAP_STYLE_URL } from '../../config';
import { useLang, tr } from '../../state/LanguageContext';
import { MapStackParams } from '../../navigation/types';

// MapLibre is a native module — present only in dev/production builds, NOT in Expo Go.
// Load it lazily so the app keeps working in Expo Go (offline map shows a notice).
let ML: any = null;
try { ML = require('@maplibre/maplibre-react-native'); } catch { ML = null; }

type Props = NativeStackScreenProps<MapStackParams, 'OfflineMap'>;

const AREAS = [
  { key: 'Район (~3 км)', km: 3 },
  { key: 'Город (~8 км)', km: 8 },
  { key: 'Регион (~20 км)', km: 20 },
] as const;

export function OfflineMapScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  useLang();
  const { country, city, places } = usePlaces();
  const center = cityCenter(country, city)!;
  const list = filterPlaces(places, country, city, null, [], '');
  const cameraRef = useRef<any>(null);

  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [packs, setPacks] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  const loadPacks = useCallback(() => { ML?.OfflineManager?.getPacks?.().then(setPacks).catch(() => {}); }, []);
  useEffect(() => { loadPacks(); }, [loadPacks]);

  const available = !!ML?.Map;
  const selPlace = sel ? list.find((p) => p.id === sel) : null;

  const download = async (km: number, label: string) => {
    if (!ML?.OfflineManager) return;
    setBusy(true); setPct(0);
    try {
      const lat = center.lat, lng = center.lng;
      const dLat = km / 111;
      const dLng = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
      const bounds: [number, number, number, number] = [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
      await ML.OfflineManager.createPack(
        { mapStyle: MAP_STYLE_URL, bounds, minZoom: 10, maxZoom: 16, metadata: { name: `${center.name} · ${label}`, createdAt: Date.now() } },
        (_pack: any, status: any) => { setPct(Math.round(status.percentage)); if (status.percentage >= 100) { setBusy(false); loadPacks(); } },
        () => { setBusy(false); Alert.alert(tr('Офлайн-карта'), tr('Не удалось скачать область.')); },
      );
      setSheet(false);
      Alert.alert(tr('Скачано'), tr('Область скачана для офлайн-доступа.'));
      loadPacks();
    } catch {
      setBusy(false);
      Alert.alert(tr('Офлайн-карта'), tr('Не удалось скачать область.'));
    }
  };

  const removePack = (id: string) => ML?.OfflineManager?.deletePack?.(id).then(loadPacks).catch(() => {});

  // Expo Go (or any build without the native module): graceful notice.
  if (!available) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <BackNav back={tr('Карта')} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="arrow.down.circle" size={34} color={T.brand} />
          </View>
          <Text style={[ty.title3, { color: T.label, marginTop: 16, textAlign: 'center' }]}>{tr('Офлайн-карта')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 8, textAlign: 'center' }]}>
            {tr('Офлайн-карта доступна в полной версии приложения (релиз), а не в Expo Go.')}
          </Text>
        </View>
      </View>
    );
  }

  const { Map, Camera, Marker, UserLocation } = ML;
  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={tr('Карта')} onBack={() => navigation.goBack()} />
      <View style={{ flex: 1 }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE_URL} compass logo={false} attribution={false}>
          <Camera ref={cameraRef} initialViewState={{ center: [center.lng, center.lat], zoom: 12 }} />
          <UserLocation />
          {list.map((p) => (
            <Marker key={p.id} lngLat={[p.lng, p.lat]} anchor="center" onPress={() => setSel(p.id)}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: CATEGORY_META[p.category].color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                <SF name={CATEGORY_META[p.category].icon} size={13} color="#fff" />
              </View>
            </Marker>
          ))}
        </Map>

        {busy ? (
          <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, backgroundColor: T.brand, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#fff" />
            <Text style={[ty.subheadEm, { color: '#fff', flex: 1 }]}>{tr('Загрузка карты…')}</Text>
            <Text style={[ty.headline, { color: '#fff' }]}>{pct}%</Text>
          </View>
        ) : null}

        <View style={{ position: 'absolute', right: 14, bottom: insets.bottom + 96, gap: 12 }}>
          <Pressable onPress={() => cameraRef.current?.flyTo?.({ center: [center.lng, center.lat], zoom: 13, duration: 500 })}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
            <SF name="location.fill" size={20} color={T.brand} />
          </Pressable>
          <Pressable onPress={() => setSheet(true)}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
            <SF name="arrow.down.circle" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Modal visible={!!selPlace} animationType="slide" transparent onRequestClose={() => setSel(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setSel(null)} />
        {selPlace ? (
          <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: CATEGORY_META[selPlace.category].color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <SF name={CATEGORY_META[selPlace.category].icon} size={24} color={CATEGORY_META[selPlace.category].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{selPlace.name}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>{CATEGORY_META[selPlace.category].label} · {selPlace.hours}</Text>
              </View>
            </View>
            <Pressable onPress={() => { const id = selPlace.id; setSel(null); navigation.navigate('PlaceDetail', { placeId: id }); }}
              style={{ marginTop: 16, height: 46, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[ty.headline, { color: T.brand }]}>{tr('Детали')}</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setSheet(false)} />
        <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '75%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
          <Text style={[ty.title3, { color: T.label, paddingHorizontal: 20 }]}>{tr('Скачать офлайн')}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 4 }]}>{center.name} · {tr('Размер области')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14 }}>
            {AREAS.map((a) => (
              <Pressable key={a.key} disabled={busy} onPress={() => download(a.km, tr(a.key))}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder, alignItems: 'center', gap: 6 }}>
                <SF name="square.and.arrow.down" size={20} color={T.brand} />
                <Text style={[ty.footnoteEm, { color: T.label, textAlign: 'center' }]}>{tr(a.key)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, textTransform: 'uppercase' }]}>{tr('Скачанные области')}</Text>
          <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {packs.length === 0 ? (
              <Text style={[ty.subhead, { color: T.labelTertiary, paddingHorizontal: 4, paddingVertical: 10 }]}>{tr('Нет скачанных областей')}</Text>
            ) : packs.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <SF name="map.fill" size={18} color={T.brand} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]} numberOfLines={1}>{String((p.metadata as any)?.name ?? p.id)}</Text>
                <Pressable onPress={() => removePack(p.id)} hitSlop={8}><SF name="trash.fill" size={16} color={T.red} /></Pressable>
              </View>
            ))}
          </ScrollView>
          <Text style={[ty.caption2, { color: T.labelTertiary, paddingHorizontal: 20, paddingTop: 6 }]}>{tr('Карта работает без интернета в скачанных областях.')}</Text>
        </View>
      </Modal>
    </View>
  );
}
