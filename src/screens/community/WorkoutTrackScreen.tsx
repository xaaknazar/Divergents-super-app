// Strava-style live run/walk tracker. Records the GPS route on the map, live
// distance/time/pace, and on finish saves the session + offers to add its
// steps-equivalent to the active challenge. Foreground tracking only (keep the
// screen on) — reuses the same react-native-maps + expo-location stack the map
// screen already uses, so it needs no extra native module / rebuild.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { hTap, hSuccess } from '../../lib/haptics';
import { useActivities, distanceToSteps, WorkoutType, WorkoutCoord, Workout } from '../../state/ActivityContext';
import { useChallenge } from '../../state/ChallengeContext';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'WorkoutTrack'>;

const ALMATY = { latitude: 43.238949, longitude: 76.889709 };

function distM(a: WorkoutCoord, b: WorkoutCoord): number {
  const R = 6371000, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
function fmtPace(sec: number, m: number): string {
  if (m < 20 || sec <= 0) return '—';
  const paceSec = sec / (m / 1000); // sec per km
  return `${Math.floor(paceSec / 60)}′${String(Math.round(paceSec % 60)).padStart(2, '0')}″`;
}

export function WorkoutTrackScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { addWorkout } = useActivities();
  const { challenge, setMetric, isParticipant, dayLocked } = useChallenge();

  const [type, setType] = useState<WorkoutType>('run');
  const [status, setStatus] = useState<'idle' | 'tracking' | 'paused' | 'done'>('idle');
  const [coords, setCoords] = useState<WorkoutCoord[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [user, setUser] = useState<WorkoutCoord | null>(null);
  const [denied, setDenied] = useState(false);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRef = useRef<WorkoutCoord | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const savedRef = useRef<Workout | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { status: st } = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      if (st !== 'granted') { setDenied(true); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (alive) setUser({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => () => { subRef.current?.remove(); if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startWatch = useCallback(async () => {
    subRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
      (loc) => {
        const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUser(c);
        const last = lastRef.current;
        if (last) {
          const d = distM(last, c);
          if (d < 2) return; // ignore GPS jitter
          setDistanceM((x) => x + d);
        }
        lastRef.current = c;
        setCoords((prev) => [...prev, c]);
        mapRef.current?.animateCamera({ center: c }, { duration: 500 });
      },
    );
  }, []);

  const startTimer = () => { timerRef.current = setInterval(() => setElapsed((x) => x + 1), 1000); };
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const start = async () => {
    hTap();
    if (denied) { Alert.alert('Нет доступа к геолокации', 'Разрешите доступ к местоположению в настройках, чтобы записывать маршрут.'); return; }
    lastRef.current = user;
    setStatus('tracking');
    try {
      await startWatch();
      startTimer();
    } catch {
      setStatus('idle');
      setDenied(true);
      Alert.alert('Не удалось начать запись', 'Проверьте доступ к геолокации и попробуйте снова.');
    }
  };
  const pause = () => { hTap(); setStatus('paused'); subRef.current?.remove(); subRef.current = null; stopTimer(); };
  const resume = async () => {
    // Во время паузы человек мог уехать/уйти. Опорной точкой была последняя
    // фиксация ДО паузы, и весь этот путь падал в дистанцию первым же фиксом
    // после «Продолжить». Сбрасываем: опорой станет первый фикс после паузы.
    hTap(); setStatus('tracking'); lastRef.current = null;
    try { await startWatch(); startTimer(); }
    catch { setStatus('paused'); Alert.alert('Не удалось продолжить', 'Проверьте доступ к геолокации и попробуйте снова.'); }
  };

  const steps = distanceToSteps(distanceM, type);
  const finish = () => {
    subRef.current?.remove(); subRef.current = null; stopTimer(); setStatus('done');
    if (savedRef.current) return;
    const w = addWorkout({ type, dateISO: new Date().toISOString(), distanceM, durationSec: elapsed, steps, coords });
    savedRef.current = w;
    hSuccess();
    const km = (distanceM / 1000).toFixed(2);
    const kind = type === 'run' ? 'Пробежка' : 'Ходьба';
    const body = `${kind} · ${km} км · ≈${pl.steps(steps)}.`;
    // Предлагать «добавить в челлендж» можно только реальному участнику:
    // у DEFAULT_CHALLENGE тоже есть задача «шаги», поэтому раньше предложение
    // видели все, а отметка уходила в несуществующий челлендж
    // 'divergents-daily' и молча терялась.
    const act = isParticipant
      ? challenge.tasks.find((t) => t.kind === 'metric' && (t.id === 'steps' || /шаг/i.test(t.unit)))
      : undefined;
    if (act && act.kind === 'metric' && steps > 0 && !dayLocked) {
      Alert.alert('Активность записана', `${body}\n\nДобавить в челлендж?`, [
        { text: 'Не сейчас', style: 'cancel', onPress: () => navigation.goBack() },
        { text: `+${pl.steps(steps)}`, onPress: () => { setMetric(act.id, act.current + steps); navigation.goBack(); } },
      ]);
    } else if (act && steps > 0 && dayLocked) {
      // День уже закрыт (23:00 по Алматы) — говорим об этом прямо, а не молчим.
      Alert.alert('Активность записана', `${body}\n\nДень челленджа уже закрыт — эти шаги пойдут в статистику тренировок, но в челлендж не попадут.`, [
        { text: 'Понятно', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Активность записана', body, [{ text: 'Готово', onPress: () => navigation.goBack() }]);
    }
  };

  const confirmDiscard = () => {
    if (status === 'idle' || savedRef.current) { navigation.goBack(); return; }
    Alert.alert('Прервать запись?', 'Текущий маршрут не сохранится.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Прервать', style: 'destructive', onPress: () => { subRef.current?.remove(); stopTimer(); navigation.goBack(); } },
    ]);
  };

  const initial = { latitude: (user ?? ALMATY).latitude, longitude: (user ?? ALMATY).longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
  const active = status === 'tracking';

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back="Челлендж" onBack={confirmDiscard} trailing={(
        <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 10, padding: 2 }}>
          {(['run', 'walk'] as const).map((k) => (
            <Pressable key={k} onPress={() => status === 'idle' && setType(k)} disabled={status !== 'idle'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: type === k ? T.systemBg : 'transparent', opacity: status !== 'idle' && type !== k ? 0.4 : 1 }}>
              <SF name={k === 'run' ? 'figure.run' : 'figure.walk'} size={13} color={type === k ? T.brand : T.labelSecondary} />
              <Text style={[ty.caption2Em, { color: type === k ? T.brand : T.labelSecondary }]}>{k === 'run' ? 'Бег' : 'Ходьба'}</Text>
            </Pressable>
          ))}
        </View>
      )} />

      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initial}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation={active}
          showsCompass={false}
        >
          {coords.length > 1 ? <Polyline coordinates={coords} strokeColor={T.brand} strokeWidth={6} lineCap="round" lineJoin="round" /> : null}
        </MapView>

        {denied ? (
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: T.cardBg, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 0.5, borderColor: T.cardBorder }}>
            <SF name="location.fill" size={18} color={T.red} />
            <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>Разрешите доступ к геолокации, чтобы записывать маршрут.</Text>
          </View>
        ) : null}

        {/* Stats + controls */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
          <View style={{ flexDirection: 'row' }}>
            {[
              { v: (distanceM / 1000).toFixed(2), l: 'км' },
              { v: fmtTime(elapsed), l: 'время' },
              { v: fmtPace(elapsed, distanceM), l: 'мин/км' },
              { v: String(steps), l: 'шагов' },
            ].map((s, i, arr) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < arr.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
                <Text style={[ty.title2, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{s.l}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            {status === 'idle' ? (
              <Pressable onPress={start} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <SF name="play.fill" size={18} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]}>Старт</Text>
              </Pressable>
            ) : status === 'done' ? (
              <Pressable onPress={() => navigation.goBack()} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.headline, { color: '#fff' }]}>Готово</Text>
              </Pressable>
            ) : (
              <>
                {active ? (
                  <Pressable onPress={pause} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <SF name="pause.fill" size={18} color={T.label} /><Text style={[ty.headline, { color: T.label }]}>Пауза</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={resume} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <SF name="play.fill" size={18} color={T.brand} /><Text style={[ty.headline, { color: T.brand }]}>Продолжить</Text>
                  </Pressable>
                )}
                <Pressable onPress={finish} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                  <SF name="checkmark" size={18} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]}>Финиш</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
