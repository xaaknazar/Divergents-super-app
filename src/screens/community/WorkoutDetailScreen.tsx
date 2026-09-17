// Одна тренировка: маршрут на карте и цифры под ним.
//
// Здесь, в отличие от списка, карта настоящая: человек пришёл смотреть именно
// маршрут, и одна карта на экран — это нормально.
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import { tr } from '../../state/LanguageContext';
import {
  useActivities, formatDistance, formatDuration, formatPace, distanceToSteps, paceTimeSec, stepsPlausible,
} from '../../state/ActivityContext';
import { useChallenge } from '../../state/ChallengeContext';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';
import { fmtInt } from '../../data/format';

type Props = NativeStackScreenProps<CommunityStackParams, 'WorkoutDetail'>;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function fullWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** «6 795» — с обычным пробелом. Неразрывный из toLocaleString iOS рвёт при обрезании строки. */

function DetailRow({ T, ty, label, note, value, last }: {
  T: any; ty: any; label: string; note?: string; value: string; last?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: T.separator }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.subhead, { color: T.label }]} numberOfLines={2}>{label}</Text>
        {note ? <Text style={[ty.caption2, { color: T.labelTertiary, marginTop: 1 }]} numberOfLines={2}>{note}</Text> : null}
      </View>
      <Text style={[ty.subheadEm, nums, { color: T.label }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function WorkoutDetailScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { workouts, removeWorkout, markAdded } = useActivities();
  const { challenge, setMetric, isParticipant, dayLocked } = useChallenge();
  const mapRef = useRef<MapView | null>(null);
  const [busy, setBusy] = useState(false);

  const w = workouts.find((x) => x.id === route.params?.workoutId) ?? null;

  // Рамка карты по всем точкам маршрута — иначе он окажется за краем экрана.
  const region = useMemo(() => {
    if (!w || w.coords.length === 0) return null;
    const lats = w.coords.map((c) => c.latitude);
    const lngs = w.coords.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      // Запас в четверть, чтобы линия не липла к краям.
      latitudeDelta: Math.max((maxLat - minLat) * 1.25, 0.004),
      longitudeDelta: Math.max((maxLng - minLng) * 1.25, 0.004),
    };
  }, [w]);

  if (!w) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader backLabel={tr('Тренировки')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="figure.run"
          title={tr('Тренировка не найдена')}
          subtitle={tr('Возможно, её удалили.')}
          actionLabel={tr('Назад')}
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const isRun = w.type === 'run';
  const isToday = sameDay(new Date(w.dateISO), new Date());
  // Задачу «шаги» ищем так же, как на экране записи: у неё может быть свой id.
  const activityTask = isParticipant
    ? challenge.tasks.find((t) => t.kind === 'metric' && (t.id === 'steps' || /шаг/i.test(t.unit)))
    : undefined;
  // В зачёт идёт число ПО ПРАВИЛАМ челленджа, а не показание шагомера: правило
  // одинаково для всех, включая тех, кто отмечается вручную. У бега это 1 км =
  // 2000 шагов — заведомо больше, чем человек делает на самом деле, и так
  // задумано. `w.steps` — измерение, `challengeSteps` — зачёт; путать нельзя.
  const challengeSteps = distanceToSteps(w.distanceM, w.type);
  // Проверка правдоподобия и для старых записей: они сохранены до её появления
  // и до сих пор показывают «221 шаг по датчику» на 3,4 км.
  const sensorOk = w.stepsMeasured === true && stepsPlausible(w.steps, w.distanceM);
  const shownSteps = sensorOk ? w.steps : challengeSteps;
  // Добавить в зачёт можно только сегодняшнюю тренировку и только один раз:
  // день закрывается в 23:00, а повторное добавление удвоило бы шаги.
  const canAdd = !!activityTask && activityTask.kind === 'metric'
    && challengeSteps > 0 && !w.addedToChallenge && isToday && !dayLocked;

  const addToChallenge = () => {
    if (!canAdd || !activityTask || activityTask.kind !== 'metric') return;
    setBusy(true);
    try {
      setMetric(activityTask.id, activityTask.current + challengeSteps);
      markAdded(w.id);
      hSuccess();
      Alert.alert(tr('Добавлено в челлендж'), `+${pl.steps(challengeSteps)} к сегодняшней активности.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(tr('Удалить тренировку?'), tr('Маршрут и статистика будут потеряны.'), [
      { text: tr('Отмена'), style: 'cancel' },
      {
        text: tr('Удалить'), style: 'destructive',
        onPress: () => { removeWorkout(w.id); navigation.goBack(); },
      },
    ]);
  };

  const stats: { v: string; l: string }[] = [
    { v: formatDistance(w.distanceM), l: tr('Дистанция') },
    // Темп — по времени в движении, как у Garmin и Strava. Раньше делили на
    // общее время, и подпись «в движении» стояла над секундомером с остановками.
    { v: `${formatPace(w.distanceM, paceTimeSec(w))}`, l: tr('Средний темп') },
    { v: formatDuration(paceTimeSec(w)), l: typeof w.movingSec === 'number' ? tr('Время в движении') : tr('Время') },
    { v: w.elevationGainM ? `${w.elevationGainM} м` : '—', l: tr('Набор высоты') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader
        backLabel={tr('Тренировки')}
        onBack={() => navigation.goBack()}
        trailing={
          <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Удалить тренировку')}>
            <SF name="trash.fill" size={18} color={T.red} />
          </Pressable>
        }
      />

      {/* Прокрутка: карта, цифры и подробности не помещаются на экран целиком,
          а нижняя панель с действиями закрывала хвост. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Шапка: что и когда */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SF name={isRun ? 'figure.run' : 'figure.walk'} size={18} color={T.brand} />
            <Text style={[ty.title2, { color: T.label }]} numberOfLines={1}>
              {isRun ? tr('Пробежка') : tr('Ходьба')}
            </Text>
          </View>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={1}>
            {fullWhen(w.dateISO)}
          </Text>
        </View>

        {/* Карта с маршрутом */}
        {region ? (
          <View style={{ height: 300, marginHorizontal: 16, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden' }}>
            <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region} showsCompass={false}>
              <Polyline coordinates={w.coords} strokeColor={T.brand} strokeWidth={5} lineCap="round" lineJoin="round" />
              {/* Старт зелёный, финиш красный — направление читается сразу. */}
              <Marker coordinate={w.coords[0]} pinColor="green" title={tr('Старт')} />
              <Marker coordinate={w.coords[w.coords.length - 1]} pinColor="red" title={tr('Финиш')} />
            </MapView>
            {/* Подпись поверх карты: скриншот этой карточки уходит в сторис и
                чаты, и по нему должно быть видно, чьё это приложение. Светлая
                плашка — чтобы читалось и на тёмной карте, и на светлой. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', right: 12, bottom: 12,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 8, paddingLeft: 10, paddingRight: 14, borderRadius: 999,
                borderCurve: 'continuous',
                backgroundColor: 'rgba(255,255,255,0.94)',
              }}
            >
              <Logo size={26} body="#234088" head="#3D5BDB" />
              <Text style={[ty.subheadEm, { color: '#234088' }]}>Divergents</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, padding: 20, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.cardBg, alignItems: 'center' }}>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>
              {tr('Маршрут не записался — GPS не дал точек.')}
            </Text>
          </View>
        )}

        {/* Цифры */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: 16 }}>
          {stats.map((s, i) => (
            <View key={i} style={{ width: '50%', paddingVertical: 12, paddingHorizontal: 4 }}>
              <Text style={[ty.title2, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.v}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Подробности строками «подпись — значение». Раньше это был сплошной
            текст в две строки с обрезанием: iOS рвал «6 795» по неразрывному
            пробелу и прятал хвост за многоточием. */}
        <View style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderCurve: 'continuous', backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder }}>
          {typeof w.movingSec === 'number' && w.durationSec - w.movingSec >= 5 ? (
            <>
              <DetailRow T={T} ty={ty} label={tr('Общее время')} value={formatDuration(w.durationSec)} />
              <DetailRow T={T} ty={ty} label={tr('Остановки')} value={formatDuration(w.durationSec - w.movingSec)} />
            </>
          ) : null}
          {/* Измерение и зачёт — разные числа, и показываем их отдельно.
              Свести их в одно значило бы либо соврать про шаги, либо занизить
              человеку баллы. */}
          <DetailRow
            T={T} ty={ty}
            label={sensorOk ? tr('Шаги по датчику телефона') : tr('Шаги по расстоянию')}
            value={`${sensorOk ? '' : '≈'}${fmtInt(shownSteps)}`}
          />
          {challengeSteps !== shownSteps ? (
            <DetailRow
              T={T} ty={ty}
              label={tr('В зачёт челленджа')}
              note={isRun ? tr('по правилу: 1 км бега = 2000 шагов') : undefined}
              value={fmtInt(challengeSteps)}
              last
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Действия */}
      <View style={{ padding: 16, paddingBottom: insets.bottom + 12, gap: 8, borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: T.cardBg }}>
        {w.addedToChallenge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 }}>
            <SF name="checkmark" size={16} color={T.greenText} />
            <Text style={[ty.headline, { color: T.greenText }]}>{tr('Засчитано в челлендж')}</Text>
          </View>
        ) : canAdd ? (
          <PrimaryButton
            label={`${tr('Добавить в челлендж')} · +${pl.steps(challengeSteps)}`}
            icon="plus"
            loading={busy}
            onPress={addToChallenge}
          />
        ) : activityTask && !isToday ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center' }]}>
            {tr('В зачёт идут только сегодняшние тренировки — день закрывается в 23:00.')}
          </Text>
        ) : activityTask && dayLocked ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center' }]}>
            {tr('День челленджа уже закрыт.')}
          </Text>
        ) : null}

        {/* Не текст, а карточка для сторис: пробежкой делятся картинкой. */}
        <Pressable
          onPress={() => navigation.navigate('WorkoutShare', { workoutId: w.id })}
          accessibilityRole="button"
          accessibilityLabel={tr('Поделиться')}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}
        >
          <SF name="square.and.arrow.up" size={16} color={T.brand} />
          <Text style={[ty.headline, { color: T.brand }]}>{tr('Поделиться')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
