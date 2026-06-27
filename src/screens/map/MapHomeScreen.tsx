import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, Modal, Linking, Platform, Share, Alert, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { Capsule, ty } from '../../components/ui';
import { Stars } from '../../components/Stars';
import { usePlaces, filterPlaces, ratingOf } from '../../state/PlacesContext';
import { COUNTRIES, CATEGORY_META, TAG_META, TAGS, CATEGORIES, PlaceCategory, PlaceTag, safeCityCenter, nearestCity, Place, isOpenNow } from '../../data/places';
import { fetchLiveTrips, fetchMyTripIds, LiveTrip } from '../../data/api';
import { MapStackParams } from '../../navigation/types';
import { useLang, tr } from '../../state/LanguageContext';
import { loadJSON, saveJSON } from '../../state/persist';

type Props = NativeStackScreenProps<MapStackParams, 'MapHome'>;
type LatLng = { latitude: number; longitude: number };

// Public OSRM / Nominatim demo endpoints require an identifying User-Agent
// (their usage policy rejects anonymous traffic). Best-effort: some platforms
// override this header, but we send it where allowed.
const NET_HEADERS = { 'User-Agent': 'DivergentsSuperApp/1.0 (https://divergents-lms.kz)' };

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function fmtDist(km: number): string { return km < 1 ? `${Math.round(km * 1000)} ${tr('м')}` : `${km.toFixed(1)} ${tr('км')}`; }
function fmtDur(min: number): string { if (min < 60) return `${Math.max(1, Math.round(min))} ${tr('мин')}`; const h = Math.floor(min / 60); return `${h} ${tr('ч')} ${Math.round(min % 60)} ${tr('мин')}`; }

type RouteT = { coords: LatLng[]; km: number; min: number };

async function fetchRoutes(from: LatLng, to: LatLng, mode: 'car' | 'foot'): Promise<RouteT[]> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const q = 'overview=full&geometries=geojson&alternatives=3';
  const urls = mode === 'foot'
    ? [`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?${q}`]
    : [`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?${q}`,
       `https://router.project-osrm.org/route/v1/driving/${coords}?${q}`];
  for (const url of urls) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', ...NET_HEADERS } });
      if (!res.ok) { clearTimeout(t); continue; }
      const d = await res.json();
      const rs = Array.isArray(d?.routes) ? d.routes : [];
      const parsed: RouteT[] = rs
        .filter((r: any) => r?.geometry?.coordinates?.length)
        .map((r: any) => ({ coords: r.geometry.coordinates.map((c: number[]) => ({ latitude: c[1], longitude: c[0] })), km: (r.distance ?? 0) / 1000, min: (r.duration ?? 0) / 60 }));
      if (parsed.length) { clearTimeout(t); return parsed.sort((a, b) => a.min - b.min); } // fastest first
    } catch { /* next */ } finally { clearTimeout(t); }
  }
  return [];
}

async function geocode(q: string, bias?: { lat: number; lng: number }): Promise<{ name: string; lat: number; lng: number }[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const vb = bias ? `&viewbox=${bias.lng - 0.7},${bias.lat + 0.5},${bias.lng + 0.7},${bias.lat - 0.5}&bounded=0` : '';
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ru&q=${encodeURIComponent(q)}${vb}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', ...NET_HEADERS } });
    if (!res.ok) return [];
    const d = await res.json();
    return (Array.isArray(d) ? d : [])
      .map((x: any) => ({ name: String(x.display_name ?? ''), lat: parseFloat(x.lat), lng: parseFloat(x.lon) }))
      .filter((x: any) => isFinite(x.lat) && isFinite(x.lng));
  } catch { return []; } finally { clearTimeout(t); }
}

export function MapHomeScreen({ navigation }: Props) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const { t } = useLang();
  const { country, city, locManual, setLocation, places, placesLoading, placesError, reloadPlaces, isFav, toggleFav } = usePlaces();
  const [locDenied, setLocDenied] = useState(false);
  const [cat, setCat] = useState<PlaceCategory | null>(null);
  const [tags, setTags] = useState<PlaceTag[]>([]);
  const [q, setQ] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [user, setUser] = useState<LatLng | null>(null);
  const [target, setTarget] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);
  const [searchPin, setSearchPin] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [zoomDelta, setZoomDelta] = useState(0.12);
  const [tracks, setTracks] = useState(true);
  const tracksTimer = useRef<any>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const [routes, setRoutes] = useState<RouteT[]>([]);
  const [routeIdx, setRouteIdx] = useState(0);
  const [mode, setMode] = useState<'car' | 'foot'>('car');
  const [routing, setRouting] = useState(false);
  const [origin, setOrigin] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [recents, setRecents] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const recalcRef = useRef(0);
  const mapRef = useRef<MapView>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const routeReqRef = useRef<string | null>(null);
  const manualRef = useRef(false);
  const autoRef = useRef(false);
  useEffect(() => { loadJSON<{ name: string; lat: number; lng: number }[]>('dvg.mapRecent', []).then(setRecents); }, []);
  const [meetings, setMeetings] = useState<LiveTrip[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = isSignedIn ? await getToken() : null;
        const [trips, myIds] = await Promise.all([fetchLiveTrips(), fetchMyTripIds(token)]);
        const now = Date.now();
        const mine = trips.filter((t) => myIds.includes(t.id) && t.meetLat != null && t.meetLng != null && (() => { const d = t.meetAt ? Date.parse(t.meetAt.replace(' ', 'T')) : NaN; return isNaN(d) ? true : d >= now; })());
        if (alive) setMeetings(mine);
      } catch {}
    })();
    return () => { alive = false; };
  }, [isSignedIn]);
  // If the user previously picked a city by hand (persisted), don't let GPS
  // auto-override it on launch.
  useEffect(() => { if (locManual) manualRef.current = true; }, [locManual]);

  const center = safeCityCenter(country, city);
  const countryName = COUNTRIES.find((c) => c.key === country)?.name ?? '';
  const cityName = center.name;
  const list = useMemo(() => filterPlaces(places, country, city, cat, tags, q), [places, country, city, cat, tags, q]);
  const sel = selId ? places.find((p) => p.id === selId) : null;

  // GPS: request + watch
  useEffect(() => {
    let alive = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      if (status !== 'granted') { setLocDenied(true); return; }
      setLocDenied(false);
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 12, timeInterval: 3000 },
        (loc) => {
          const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUser(c);
          setPath((prev) => (targetRef.current ? [...prev, c] : prev));
        }
      );
    })();
    return () => { alive = false; subRef.current?.remove(); };
  }, []);

  useEffect(() => {
    const from = origin ? { latitude: origin.lat, longitude: origin.lng } : user;
    if (!target || !from) return;
    const key = `${origin ? `${origin.lat},${origin.lng}` : 'me'}|${target.lat},${target.lng}|${mode}`;
    if (routeReqRef.current === key) return;
    routeReqRef.current = key;
    let alive = true;
    setRoutes([]); setRouteIdx(0); setRouting(true);
    fetchRoutes(from, { latitude: target.lat, longitude: target.lng }, mode).then((rs) => { if (alive) { setRoutes(rs); setRouteIdx(0); setRouting(false); } });
    return () => { alive = false; };
  }, [target, user, mode, origin]);

  // Off-route auto-recalc (only when navigating from current location).
  useEffect(() => {
    if (!target || origin || routing || !user || routes.length === 0) return;
    const sel = routes[routeIdx]?.coords ?? [];
    if (sel.length < 2) return;
    let min = Infinity;
    for (let i = 0; i < sel.length; i += 2) { const d = haversineKm(user, sel[i]); if (d < min) min = d; }
    const now = Date.now();
    if (min > 0.09 && now - recalcRef.current > 6000) { recalcRef.current = now; routeReqRef.current = null; }
  }, [user, target, origin, routes, routeIdx, routing]);

  // Address / building search (OSM Nominatim), debounced.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setGeo([]); setGeoBusy(false); return; }
    setGeoBusy(true);
    const id = setTimeout(async () => { const r = await geocode(term, center ? { lat: center.lat, lng: center.lng } : undefined); setGeo(r); setGeoBusy(false); }, 550);
    return () => clearTimeout(id);
  }, [q]);

  // First GPS fix: center on the user and auto-pick their city (until changed manually).
  useEffect(() => {
    if (!user || autoRef.current) return;
    autoRef.current = true;
    if (!manualRef.current) {
      const nc = nearestCity(user.latitude, user.longitude);
      if (nc) setLocation(nc.country, nc.city);
    }
    mapRef.current?.animateToRegion({ ...user, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 700);
  }, [user]);

  const recenter = () => {
    if (!user) {
      // Explain why we can't recenter instead of doing nothing.
      if (locDenied) {
        Alert.alert(
          tr('Геолокация выключена'),
          tr('Разрешите доступ к геопозиции в настройках, чтобы видеть себя на карте.'),
          [
            { text: tr('Открыть настройки'), onPress: () => Linking.openSettings().catch(() => {}) },
            { text: tr('Отмена'), style: 'cancel' },
          ],
        );
      } else {
        Alert.alert(tr('Определяем геопозицию'), tr('Ждём сигнал GPS… Попробуйте через секунду.'));
      }
      return;
    }
    const nc = nearestCity(user.latitude, user.longitude);
    if (nc && (nc.country !== country || nc.city !== city)) setLocation(nc.country, nc.city);
    mapRef.current?.animateToRegion({ ...user, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
  };
  const openPlace = (id: string) => navigation.navigate('PlaceDetail', { placeId: id });
  const navTo = (n: { name: string; lat: number; lng: number }) => { routeReqRef.current = null; setTarget(n); setRoutes([]); setRouteIdx(0); setPath(user ? [user] : []); setSelId(null); setSearchPin(null); if (mapRef.current) mapRef.current.animateToRegion({ latitude: n.lat, longitude: n.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500); };
  const startNav = (p: Place) => navTo({ name: p.name, lat: p.lat, lng: p.lng });
  const stopNav = () => { routeReqRef.current = null; setTarget(null); setPath([]); setRoutes([]); setRouteIdx(0); setOrigin(null); };
  const externalRoute = (t: { lat: number; lng: number }) => Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${t.lat},${t.lng}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`);
  const pickGeo = (g: { name: string; lat: number; lng: number }) => {
    setSearchPin(g); setGeo([]); setQ(''); setSearchFocused(false);
    setRecents((prev) => { const n = [g, ...prev.filter((x) => x.name !== g.name)].slice(0, 6); saveJSON('dvg.mapRecent', n); return n; });
    mapRef.current?.animateToRegion({ latitude: g.lat, longitude: g.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 500);
  };
  const shareRoute = () => { if (!target) return; const o = origin ? `${origin.lat},${origin.lng}` : user ? `${user.latitude},${user.longitude}` : ''; Share.share({ message: `Маршрут в «${target.name}»: https://www.google.com/maps/dir/?api=1${o ? `&origin=${o}` : ''}&destination=${target.lat},${target.lng}` }); };
  const longMenu = (c: LatLng) => {
    Alert.alert('Точка на карте', `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`, [
      { text: tr('Маршрут сюда'), onPress: () => navTo({ name: tr('Точка на карте'), lat: c.latitude, lng: c.longitude }) },
      { text: tr('Маршрут отсюда'), onPress: () => { setOrigin({ name: tr('Точка А'), lat: c.latitude, lng: c.longitude }); routeReqRef.current = null; } },
      { text: tr('Добавить место здесь'), onPress: () => navigation.navigate('AddPlace', { lat: c.latitude, lng: c.longitude }) },
      { text: tr('Отмена'), style: 'cancel' },
    ]);
  };

  const distTo = (p: Place) => (user ? fmtDist(haversineKm(user, { latitude: p.lat, longitude: p.lng })) : null);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {(
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={() => Keyboard.dismiss()}
          onPanDrag={() => Keyboard.dismiss()}
          onLongPress={(e) => longMenu(e.nativeEvent.coordinate)}
          onRegionChangeComplete={(r) => { setZoomDelta(r.latitudeDelta); setTracks(true); clearTimeout(tracksTimer.current); tracksTimer.current = setTimeout(() => setTracks(false), 500); }}
        >
          {(() => { const mk = Math.round(40 - Math.min(1, Math.max(0, (zoomDelta - 0.02) / 0.28)) * 22); return list.map((p) => {
            const oi = isOpenNow(p.hours); const closed = oi.known && !oi.open;
            return (
            <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => setSelId(p.id)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracks}>
              <View style={{ width: mk, height: mk, borderRadius: mk / 2, backgroundColor: closed ? '#9CA3AF' : CATEGORY_META[p.category].color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
                <SF name={CATEGORY_META[p.category].icon} size={Math.round(mk * 0.5)} color="#fff" />
              </View>
            </Marker>
          ); }); })()}
          {origin ? <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} anchor={{ x: 0.5, y: 0.5 }}><View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}><Text style={[ty.footnoteEm, { color: '#fff' }]}>A</Text></View></Marker> : null}
          {target && routes.length > 0
            ? routes.map((rt, i) => (
                <Polyline key={i} coordinates={rt.coords} strokeColor={i === routeIdx ? T.brand : 'rgba(120,120,140,0.45)'} strokeWidth={i === routeIdx ? 7 : 4} tappable onPress={() => setRouteIdx(i)} zIndex={i === routeIdx ? 3 : 1} />
              ))
            : target && user ? <Polyline coordinates={[user, { latitude: target.lat, longitude: target.lng }]} strokeColor={T.brand} strokeWidth={3} lineDashPattern={[8, 6]} /> : null}
          {searchPin ? <Marker coordinate={{ latitude: searchPin.lat, longitude: searchPin.lng }} pinColor="#FF3B30" onPress={() => {}} /> : null}
          {path.length > 1 ? <Polyline coordinates={path} strokeColor={T.brandAccent} strokeWidth={5} /> : null}
          {meetings.map((m) => (
            <Marker key={`meet_${m.id}`} coordinate={{ latitude: m.meetLat!, longitude: m.meetLng! }} anchor={{ x: 0.5, y: 1 }}
              title={`Встреча · ${m.title}`} description={`${m.meetPlace ?? ''}${m.meetAt ? ` · ${m.meetAt}` : ''}`.trim().replace(/^· /, '')}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: '#2f5bd6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <SF name="flag.fill" size={11} color="#fff" />
                  <Text style={[ty.caption2Em, { color: '#fff' }]} numberOfLines={1}>{m.meetAt ? m.meetAt.split(' ').slice(-1)[0] : 'Встреча'}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Top overlay: search + location + filters */}
      <View style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.cardBg, borderRadius: 14, paddingHorizontal: 12, height: 44, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
            <SF name="magnifyingglass" size={16} color={T.labelSecondary} />
            <TextInput value={q} onChangeText={setQ} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} placeholder={t('map_search_ph')} placeholderTextColor={T.labelTertiary} style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0 }]} />
            {q.length > 0 ? <Pressable onPress={() => setQ('')} hitSlop={8}><SF name="xmark.circle.fill" size={16} color={T.labelTertiary} /></Pressable> : null}
          </View>
          <Pressable onPress={() => setPickerOpen(true)} style={{ height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: T.cardBg, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
            <SF name="mappin.circle.fill" size={16} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{cityName}</Text>
            <SF name="chevron.down" size={11} color={T.labelSecondary} />
          </Pressable>
        </View>
        {searchFocused && q.trim().length < 3 && recents.length > 0 ? (
          <View style={{ marginHorizontal: 12, marginTop: 8, backgroundColor: T.cardBg, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            <Text style={[ty.caption1, { color: T.labelSecondary, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }]} numberOfLines={1}>{t('recent_')}</Text>
            {recents.map((g, i) => (
              <Pressable key={i} onPress={() => pickGeo(g)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
                <SF name="clock.arrow.circlepath" size={15} color={T.labelSecondary} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]} numberOfLines={1}>{g.name.split(',')[0]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {q.trim().length >= 3 ? (
          <View style={{ marginHorizontal: 12, marginTop: 8, backgroundColor: T.cardBg, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            {geoBusy && geo.length === 0 ? (
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}><SF name="magnifyingglass" size={14} color={T.labelSecondary} /><Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Поиск адресов…')}</Text></View>
            ) : null}
            {!geoBusy && geo.length === 0 ? (
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}><SF name="magnifyingglass" size={14} color={T.labelTertiary} /><Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Ничего не найдено')}</Text></View>
            ) : null}
            {geo.map((g, i) => (
              <Pressable key={i} onPress={() => pickGeo(g)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i ? 0.5 : 0, borderTopColor: T.separator }}>
                <SF name="mappin.and.ellipse" size={16} color={T.brand} />
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]} numberOfLines={2}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
          <FChip label={t('all')} active={!cat} onPress={() => setCat(null)} T={T} />
          {CATEGORIES.map((c) => <FChip key={c} label={CATEGORY_META[c].label} icon={CATEGORY_META[c].icon} active={cat === c} onPress={() => setCat(cat === c ? null : c)} T={T} />)}
          {TAGS.map((t) => <FChip key={t} label={TAG_META[t].label} icon={TAG_META[t].icon} active={tags.includes(t)} onPress={() => setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])} T={T} />)}
        </ScrollView>
      </View>

      {/* Navigation banner */}
      {target ? (() => {
        const rt = routes[routeIdx];
        const Pill = ({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) => (
          <Pressable onPress={onPress} hitSlop={4} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.14)' }}>
            <Text style={[ty.footnoteEm, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
          </Pressable>
        );
        return (
          <View style={{ position: 'absolute', top: insets.top + 104, left: 12, right: 12, backgroundColor: T.brand, borderRadius: 16, padding: 12, gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SF name="paperplane.fill" size={18} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={[ty.subheadEm, { color: '#fff' }]} numberOfLines={1}>{tr('До')} «{target.name}»</Text>
                <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                  {routing ? tr('ищу самый быстрый маршрут…') : rt ? `${fmtDist(rt.km)} · ${fmtDur(rt.min)}${routeIdx === 0 ? ' · ' + tr('самый быстрый') : ''}` : user ? `${fmtDist(haversineKm(user, { latitude: target.lat, longitude: target.lng }))} ${tr('по прямой')}` : tr('ждём GPS…')}
                </Text>
              </View>
              <Pressable onPress={stopNav} hitSlop={8}><SF name="xmark" size={18} color="#fff" /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pill label={t('car')} on={mode === 'car'} onPress={() => setMode('car')} />
              <Pill label={t('walk')} on={mode === 'foot'} onPress={() => setMode('foot')} />
              <View style={{ flex: 1 }} />
              {routes.length > 1 ? <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>{tr('ещё')} {routes.length - 1}</Text> : null}
              <Pressable onPress={shareRoute} hitSlop={6}><SF name="square.and.arrow.up" size={17} color="#fff" /></Pressable>
            </View>
            {origin ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SF name="smallcircle.filled.circle" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.9)', flex: 1 }]} numberOfLines={1}>{tr('Откуда:')} {origin.name}</Text>
                <Pressable onPress={() => { setOrigin(null); routeReqRef.current = null; }} hitSlop={6}><Text style={[ty.caption2, { color: '#fff', textDecorationLine: 'underline' }]} numberOfLines={1}>{tr('от меня')}</Text></Pressable>
              </View>
            ) : null}
          </View>
        );
      })() : null}

      {/* Empty / error notice for the live places list (no fake data) */}
      {!placesLoading && !target && list.length === 0 ? (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 100, alignItems: 'center' }} pointerEvents="box-none">
          <View style={{ backgroundColor: T.cardBg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 360, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            <SF name={placesError ? 'wifi.slash' : 'mappin.circle.fill'} size={18} color={placesError ? T.red : T.labelSecondary} />
            <Text style={[ty.subhead, { color: T.labelSecondary, flex: 1 }]}>
              {placesError ? tr('Не удалось загрузить места.') : tr('Пока нет мест в этом городе.')}
            </Text>
            {placesError ? (
              <Pressable onPress={reloadPlaces} hitSlop={8}><Text style={[ty.subheadEm, { color: T.brand }]} numberOfLines={1}>{tr('Повторить')}</Text></Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Right floating buttons */}
      <View style={{ position: 'absolute', right: 14, bottom: insets.bottom + 96, gap: 12 }}>
        <Round icon="arrow.down.circle" onPress={() => navigation.navigate('OfflineMap')} T={T} />
        <Round icon="location.fill" onPress={recenter} T={T} />
        <Round icon="plus" brand onPress={() => navigation.navigate('AddPlace')} T={T} />
      </View>

      {/* Place peek */}
      <Modal visible={!!sel} animationType="slide" transparent onRequestClose={() => setSelId(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setSelId(null)} />
        {sel ? (
          <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
            {sel.photo ? <Image source={{ uri: sel.photo }} style={{ width: '100%', height: 150, marginBottom: 6 }} contentFit="cover" /> : null}
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: CATEGORY_META[sel.category].color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <SF name={CATEGORY_META[sel.category].icon} size={24} color={CATEGORY_META[sel.category].color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{sel.name}</Text>
                    {sel.approved ? <SF name="checkmark.seal.fill" size={15} color="#0EA5E9" /> : null}
                  </View>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                    {CATEGORY_META[sel.category].label} · {sel.hours}{distTo(sel) ? ` · ${distTo(sel)}` : ''}
                  </Text>
                  {isOpenNow(sel.hours).known ? <Text style={[ty.caption1, { color: isOpenNow(sel.hours).open ? '#16A34A' : '#EF4444', marginTop: 2 }]} numberOfLines={1}>{isOpenNow(sel.hours).label}</Text> : null}
                </View>
                {ratingOf(sel) > 0 ? <View style={{ alignItems: 'flex-end' }}><Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{ratingOf(sel).toFixed(1)}</Text><Stars value={ratingOf(sel)} size={11} /></View> : null}
              </View>
              <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 12 }]} numberOfLines={3}>{sel.highlights}</Text>
              {sel.tags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {sel.tags.slice(0, 5).map((t) => <Capsule key={t} bg={T.brandTinted} color={T.brand}><SF name={TAG_META[t].icon} size={10} color={T.brand} />{TAG_META[t].label}</Capsule>)}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => startNav(sel)} style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: T.brand, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 })}>
                  <SF name="paperplane.fill" size={15} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Вести сюда')}</Text>
                </Pressable>
                <Pressable onPress={() => { const id = sel.id; setSelId(null); openPlace(id); }} style={({ pressed }) => ({ width: 84, height: 48, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <Text style={[ty.headline, { color: T.brand }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Детали')}</Text>
                </Pressable>
                <Pressable onPress={() => toggleFav(sel.id)} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, backgroundColor: isFav(sel.id) ? T.brandTinted : T.fillSecondary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <SF name={isFav(sel.id) ? 'heart.fill' : 'heart'} size={18} color={isFav(sel.id) ? T.brand : T.label} />
                </Pressable>
                <Pressable onPress={() => Share.share({ message: `${sel.name} — ${CATEGORY_META[sel.category].label}\n${sel.highlights}\nhttps://2gis.kz/geo/${sel.lng},${sel.lat}` })} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <SF name="square.and.arrow.up" size={18} color={T.label} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Searched address peek */}
      <Modal visible={!!searchPin} animationType="slide" transparent onRequestClose={() => setSearchPin(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setSearchPin(null)} />
        {searchPin ? (
          <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                  <SF name="mappin.and.ellipse" size={22} color="#FF3B30" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{searchPin.name.split(',')[0]}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={2}>{searchPin.name}{user ? ` · ${fmtDist(haversineKm(user, { latitude: searchPin.lat, longitude: searchPin.lng }))}` : ''}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => navTo(searchPin)} style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 14, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: T.brand, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 })}>
                  <SF name="figure.walk" size={15} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Вести сюда')}</Text>
                </Pressable>
                <Pressable onPress={() => externalRoute(searchPin)} style={({ pressed }) => ({ width: 110, height: 48, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <Text style={[ty.headline, { color: T.brand }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{tr('Навигатор')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* City picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setPickerOpen(false)} />
        <View style={{ backgroundColor: T.systemBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16, maxHeight: '70%' }}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: T.fillSecondary }} /></View>
          <Text style={[ty.title3, { color: T.label, paddingHorizontal: 20, paddingBottom: 8 }]} numberOfLines={1}>{tr('Выберите город')}</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
            {COUNTRIES.map((co) => (
              <View key={co.key}>
                <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }]} numberOfLines={1}>{co.name}</Text>
                {co.cities.map((ci) => {
                  const on = co.key === country && ci.key === city;
                  return (
                    <Pressable key={ci.key} onPress={() => { manualRef.current = true; setLocation(co.key, ci.key, true); setPickerOpen(false); mapRef.current?.animateToRegion({ latitude: ci.lat, longitude: ci.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 600); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: on ? T.brandTinted : 'transparent' }}>
                      <SF name="mappin.circle.fill" size={18} color={on ? T.brand : T.labelTertiary} />
                      <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{ci.name}</Text>
                      {on ? <SF name="checkmark" size={16} color={T.brand} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function FChip({ label, icon, active, onPress, T }: { label: string; icon?: any; active?: boolean; onPress: () => void; T: any }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 18, backgroundColor: active ? T.brand : T.cardBg, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      {icon ? <SF name={icon} size={12} color={active ? '#fff' : T.brand} /> : null}
      <Text style={[ty.footnoteEm, { color: active ? '#fff' : T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
    </Pressable>
  );
}

function Round({ icon, onPress, brand, active, T }: { icon: any; onPress: () => void; brand?: boolean; active?: boolean; T: any }) {
  const bg = brand ? T.brand : active ? '#F59E0B' : T.cardBg;
  return (
    <Pressable onPress={onPress} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}>
      <SF name={icon} size={20} color={brand || active ? '#fff' : T.brand} />
    </Pressable>
  );
}
