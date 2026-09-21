// Трекер пробежки и ходьбы: маршрут на карте, дистанция, время, темп, а по
// завершении — сохранение тренировки и предложение засчитать её шаги в
// челлендж.
//
// Сама запись живёт в src/state/workoutTracker.ts и продолжается в фоне: с
// погашенным экраном и свёрнутым приложением. Раньше подписка на координаты
// висела прямо здесь и умирала вместе с экраном — пробежка обрывалась ровно
// там, где человек убирал телефон в карман.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { BackNav } from '../../components/headers';
import { SF } from '../../components/SFIcon';
import { hTap, hSuccess } from '../../lib/haptics';
import { useActivities, distanceToSteps, stepsPlausible, WorkoutType, WorkoutCoord, Workout } from '../../state/ActivityContext';
import { useChallenge } from '../../state/ChallengeContext';
import * as tracker from '../../state/workoutTracker';
import type { WorkoutSession } from '../../state/workoutTracker';
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
  const { addWorkout, markAdded } = useActivities();
  const { challenge, setMetric, isParticipant, dayLocked, canMark } = useChallenge();

  // Маршрут живёт НЕ в этом экране, а в модуле workoutTracker: система
  // доставляет координаты в фоновую задачу, которая работает и при закрытом
  // экране. Экран — только пульт и отображение.
  const [session, setSession] = useState<WorkoutSession>(() => tracker.getSession());
  const [type, setType] = useState<WorkoutType>('run');
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [user, setUser] = useState<WorkoutCoord | null>(null);
  const [denied, setDenied] = useState(false);
  // Разрешение «всегда» не дали: пишем, но предупреждаем, что при сворачивании
  // запись прервётся.
  const [foregroundOnly, setForegroundOnly] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const savedRef = useRef<Workout | null>(null);

  const coords = session.coords;
  const distanceM = session.distanceM;
  const status: 'idle' | 'tracking' | 'paused' | 'done' =
    done ? 'done' : !session.active ? 'idle' : session.paused ? 'paused' : 'tracking';

  // Подписка на хранилище + подъём сохранённой записи. Человек мог свернуть
  // приложение на середине пробежки, а вернуться через полчаса — маршрут
  // должен быть на месте.
  useEffect(() => {
    let alive = true;
    tracker.restore().then((s) => { if (alive) { setSession(s); if (s.active) setType(s.type); } });
    const off = tracker.subscribe((s) => { if (alive) setSession(s); });
    return () => { alive = false; off(); };
  }, []);

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

  // Первый полученный фикс нужно ПОКАЗАТЬ. `initialRegion` применяется ровно
  // один раз, при создании карты, — а в этот момент координат ещё нет, и там
  // стоит запасной центр (Алматы). Когда GPS отвечает, менять `initialRegion`
  // уже бесполезно: MapView его игнорирует. Поэтому двигаем камеру вручную.
  //
  // Без этого человек в Астане или Шымкенте открывал экран и видел Алматы:
  // своя синяя точка была за сотни километров от кадра, и карта оставалась
  // чужой до тех пор, пока он не нажмёт «Старт».
  const centeredRef = useRef(false);
  useEffect(() => {
    if (!user || centeredRef.current) return;
    centeredRef.current = true;
    mapRef.current?.animateToRegion(
      { latitude: user.latitude, longitude: user.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      450,
    );
  }, [user]);

  // Секундомер тикает от времени старта, а не считает свои такты: пока экран
  // был свёрнут, интервалы не выполнялись, и счётчик отставал ровно на время
  // отсутствия. Теперь время берётся из записи и остаётся верным после
  // возвращения.
  useEffect(() => {
    const tick = () => {
      setElapsed(tracker.elapsedSec());
      // Заодно подтягиваем шагомер. Отдельного таймера он не заводит — незачем
      // будить систему в фоне ради числа, которое некому показать.
      void tracker.refreshSteps();
    };
    tick();
    if (!session.active || session.paused) return;
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [session.active, session.paused, session.segmentStartedAt]);

  // Камера следует за последней точкой маршрута, пока идёт запись.
  useEffect(() => {
    if (status !== 'tracking') return;
    const last = coords[coords.length - 1];
    if (last) mapRef.current?.animateCamera({ center: last }, { duration: 500 });
  }, [coords.length, status]);

  const start = async () => {
    hTap();
    if (denied) { Alert.alert('Нет доступа к геолокации', 'Разрешите доступ к местоположению в настройках, чтобы записывать маршрут.'); return; }
    const res = await tracker.start(type);
    if (!res.ok && res.reason === 'denied') {
      setDenied(true);
      Alert.alert('Нет доступа к геолокации', 'Разрешите доступ к местоположению в настройках, чтобы записывать маршрут.');
      return;
    }
    if (!res.ok && res.reason === 'error') {
      Alert.alert('Не удалось начать запись', 'Проверьте доступ к геолокации и попробуйте снова.');
      return;
    }
    if (!res.ok && res.reason === 'background_denied') {
      // Запись идёт, но оборвётся при сворачивании. Сказать об этом надо
      // ЗАРАНЕЕ: узнать об обрыве после пробежки — потерять пробежку.
      setForegroundOnly(true);
      Alert.alert(
        'Запись прервётся при сворачивании',
        'Чтобы маршрут писался с погашенным экраном, разрешите доступ к геолокации «Всегда» в настройках. Сейчас запись идёт, пока приложение открыто.',
      );
    } else {
      setForegroundOnly(false);
    }
  };

  const pause = () => { hTap(); void tracker.pause(); };
  const resume = () => { hTap(); void tracker.resume(); };

  // Измеренные шаги, если телефон умеет их считать; иначе — прикидка из
  // расстояния, как было раньше. Разница ощутимая: прикидка делит метры на
  // среднюю длину шага, а датчик считает сами шаги.
  // Живой счётчик показывает датчик как есть: проверка правдоподобия — на
  // финише, когда дистанция известна целиком. На ходу она бы заставляла число
  // прыгать между датчиком и прикидкой.
  const measured = session.active && session.steps !== null;
  const steps = measured ? (session.steps as number) : distanceToSteps(distanceM, type);
  // Флаг ставится ДО await: `savedRef` заполняется только после сохранения, а
  // между нажатием и ответом трекера успевает пройти второй тап — и тренировка
  // сохранялась дважды, причём вторая пустышкой на 0,00 км: сессия к тому
  // моменту уже очищена.
  const finishingRef = useRef(false);

  const finish = async () => {
    if (savedRef.current || finishingRef.current) return;
    finishingRef.current = true;
    const result = await tracker.finish();
    setDone(true);
    const trustSensor = result.steps !== null && stepsPlausible(result.steps, result.distanceM);
    const w = addWorkout({
      type: result.type,
      dateISO: new Date().toISOString(),
      distanceM: result.distanceM,
      durationSec: result.durationSec,
      movingSec: result.movingSec,
      // Измеренные шаги, если шагомер их дал и им можно верить. Ноль от датчика
      // — тоже ответ (человек стоял), поэтому проверяем на null, а не на
      // «пусто». А вот 221 шаг на 3,4 км — не ответ, а сбой датчика: тогда
      // честнее прикидка из расстояния с пометкой «≈».
      steps: trustSensor ? (result.steps as number) : distanceToSteps(result.distanceM, result.type),
      stepsMeasured: trustSensor,
      coords: result.coords,
      elevationGainM: result.elevationGainM,
    });
    savedRef.current = w;
    hSuccess();
    // Итог берём из результата записи, а не из состояния экрана: между
    // нажатием «Финиш» и этой строкой могла прийти последняя фоновая точка.
    const finalSteps = w.steps;
    // В челлендж уходит зачёт ПО ПРАВИЛАМ челленджа (у бега — 1 км = 2000
    // шагов), а не измеренное датчиком число. Это разные величины, и подменять
    // одну другой нельзя: правило одинаково для всех 160 участников, в том
    // числе для тех, кто отмечается вручную и без трекера.
    const challengeSteps = distanceToSteps(result.distanceM, result.type);
    const km = (result.distanceM / 1000).toFixed(2);
    const kind = result.type === 'run' ? 'Пробежка' : 'Ходьба';
    const stepsLabel = w.stepsMeasured ? pl.steps(finalSteps) : `≈${pl.steps(finalSteps)}`;
    const body = `${kind} · ${km} км · ${stepsLabel}.`;
    // Предлагать «добавить в челлендж» можно только реальному участнику:
    // у DEFAULT_CHALLENGE тоже есть задача «шаги», поэтому раньше предложение
    // видели все, а отметка уходила в несуществующий челлендж
    // 'divergents-daily' и молча терялась.
    const act = isParticipant
      ? challenge.tasks.find((t) => t.kind === 'metric' && (t.id === 'steps' || /шаг/i.test(t.unit)))
      : undefined;
    if (act && act.kind === 'metric' && challengeSteps > 0 && canMark) {
      // Когда зачёт расходится с измеренным — говорим об этом прямо. Молча
      // добавить другое число значит подставить человека: он сверится с
      // часами, увидит расхождение и решит, что приложение врёт.
      const note = w.stepsMeasured && challengeSteps !== finalSteps
        ? `\n\nВ челлендж пойдёт ${pl.steps(challengeSteps)} — по правилу зачёта${result.type === 'run' ? ' (1 км бега = 2000 шагов)' : ''}.`
        : '';
      Alert.alert('Активность записана', `${body}${note}\n\nДобавить в челлендж?`, [
        { text: 'Не сейчас', style: 'cancel', onPress: () => navigation.goBack() },
        { text: `+${pl.steps(challengeSteps)}`, onPress: () => { setMetric(act.id, act.current + challengeSteps); markAdded(w.id); navigation.goBack(); } },
      ]);
    } else if (act && challengeSteps > 0 && !dayLocked && !canMark) {
      // Вышел по белому флагу 🏳️ или выбыл: зачёт заморожен, и предлагать
      // «добавить в челлендж» здесь было бы обещанием, которого сервер не
      // выполнит. Тренировка при этом записана как обычно.
      Alert.alert('Активность записана', `${body}\n\nВ челлендж шаги не пойдут — ваш зачёт уже зафиксирован. Тренировка сохранена в статистику.`, [
        { text: 'Понятно', onPress: () => navigation.goBack() },
      ]);
    } else if (act && challengeSteps > 0 && dayLocked) {
      // День уже закрыт (23:00 по Алматы) — говорим об этом прямо, а не молчим.
      Alert.alert('Активность записана', `${body}\n\nДень челленджа уже закрыт — эти шаги пойдут в статистику тренировок, но в челлендж не попадут.`, [
        { text: 'Понятно', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Активность записана', body, [{ text: 'Готово', onPress: () => navigation.goBack() }]);
    }
  };

  // Уход с экрана во время записи — с подтверждением, КАКИМ БЫ СПОСОБОМ он ни
  // происходил.
  //
  // Раньше диалог висел только на кнопке «назад» в шапке, а свайп от края
  // проходил мимо него. Запись при этом не прерывалась: трекер живёт отдельно
  // от экрана и продолжает писать точки в фоне. То есть человек делал жест,
  // которым хотел прервать пробежку, оказывался на предыдущем экране без
  // единого признака идущей записи — и уходил в уверенности, что всё
  // остановлено, пока GPS молча ел батарею.
  //
  // usePreventRemove перехватывает любой уход: кнопку, свайп, аппаратную
  // «назад» на Android. Сам экран после этого ничего не решает.
  usePreventRemove(status === 'tracking' || status === 'paused', ({ data }) => {
    Alert.alert('Прервать запись?', 'Текущий маршрут не сохранится.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Прервать', style: 'destructive', onPress: () => { void tracker.discard(); navigation.dispatch(data.action); } },
    ]);
  });

  const confirmDiscard = () => navigation.goBack();

  const initial = { latitude: (user ?? ALMATY).latitude, longitude: (user ?? ALMATY).longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
  const active = status === 'tracking';

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <BackNav back={route.params?.challengeId ? "Челлендж" : "Назад"} onBack={confirmDiscard} trailing={(
        <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 10, borderCurve: 'continuous', padding: 2 }}>
          {(['run', 'walk'] as const).map((k) => (
            <Pressable key={k} onPress={() => status === 'idle' && setType(k)} disabled={status !== 'idle'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderCurve: 'continuous', backgroundColor: type === k ? T.systemBg : 'transparent', opacity: status !== 'idle' && type !== k ? 0.4 : 1 }}>
              <SF name={k === 'run' ? 'figure.run' : 'figure.walk'} size={13} color={type === k ? T.brand : T.labelSecondary} />
              <Text style={[ty.caption2Em, { color: type === k ? T.brand : T.labelSecondary }]}>{k === 'run' ? 'Бег' : 'Ходьба'}</Text>
            </Pressable>
          ))}
        </View>
      )} />

      {/* Разрешения «всегда» нет — запись оборвётся при сворачивании. Полоска
          висит всю тренировку, а не только в момент старта: человек мог
          пропустить окно и уйти бегать в уверенности, что всё пишется. */}
      {foregroundOnly && status !== 'idle' && status !== 'done' ? (
        <Pressable
          onPress={() => Linking.openSettings().catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel="Открыть настройки геолокации"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,149,0,0.16)' }}
        >
          <SF name="exclamationmark.triangle.fill" size={15} color={T.orange} />
          <Text style={[ty.caption1, { color: T.label, flex: 1 }]}>
            Не сворачивайте приложение — запись прервётся. Нажмите, чтобы разрешить геолокацию «Всегда».
          </Text>
        </Pressable>
      ) : null}

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
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: T.cardBg, borderRadius: 14, borderCurve: 'continuous', padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 0.5, borderColor: T.cardBorder }}>
            <SF name="location.fill" size={18} color={T.red} />
            <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>Разрешите доступ к геолокации, чтобы записывать маршрут.</Text>
          </View>
        ) : null}

        {/* Stats + controls */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: 'continuous', paddingTop: 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
          <View style={{ flexDirection: 'row' }}>
            {[
              { v: (distanceM / 1000).toFixed(2), l: 'км' },
              { v: fmtTime(elapsed), l: 'время' },
              // Темп — по времени в движении, как на часах: минута у
              // светофора не должна замедлять цифру на экране.
              { v: fmtPace(session.active ? session.movingMs / 1000 : elapsed, distanceM), l: 'мин/км' },
              { v: String(steps), l: 'шагов' },
            ].map((s, i, arr) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < arr.length - 1 ? 0.5 : 0, borderRightColor: T.separator }}>
                <Text style={[ty.title2, nums, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>{s.l}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            {status === 'idle' ? (
              <Pressable onPress={start} style={{ flex: 1, height: 54, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <SF name="play.fill" size={18} color="#fff" /><Text style={[ty.headline, { color: '#fff' }]}>Старт</Text>
              </Pressable>
            ) : status === 'done' ? (
              <Pressable onPress={() => navigation.goBack()} style={{ flex: 1, height: 54, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.headline, { color: '#fff' }]}>Готово</Text>
              </Pressable>
            ) : (
              <>
                {active ? (
                  <Pressable onPress={pause} style={{ flex: 1, height: 54, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <SF name="pause.fill" size={18} color={T.label} /><Text style={[ty.headline, { color: T.label }]}>Пауза</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={resume} style={{ flex: 1, height: 54, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.fillSecondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                    <SF name="play.fill" size={18} color={T.brand} /><Text style={[ty.headline, { color: T.brand }]}>Продолжить</Text>
                  </Pressable>
                )}
                <Pressable onPress={finish} style={{ flex: 1, height: 54, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.red, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
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
