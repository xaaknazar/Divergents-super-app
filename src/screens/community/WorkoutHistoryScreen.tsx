// История тренировок: пробежки и ходьба с маршрутом, дистанцией, временем и
// темпом. Карточки — как в Strava: рисунок маршрута слева, цифры справа.
//
// Тренировки хранятся на устройстве (ActivityContext), поэтому экран открывается
// мгновенно и работает без сети.
import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { RouteThumb } from '../../components/RouteThumb';
import { tr } from '../../state/LanguageContext';
import {
  useActivities, Workout,
  formatDistance, formatDuration, formatPace, paceTimeSec,
} from '../../state/ActivityContext';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';
import { fmtInt } from '../../data/format';

type Props = NativeStackScreenProps<CommunityStackParams, 'WorkoutHistory'>;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «5 сентября, 19:08» — как подписывают тренировку в приложениях для бега. */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (isToday) return `${tr('Сегодня')}, ${time}`;
  if (isYesterday) return `${tr('Вчера')}, ${time}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}`;
}

/** Группируем по месяцам: за пятнадцать дней челленджа список длинный. */
function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function monthTitle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = MONTHS[d.getMonth()].replace(/я$/, 'ь').replace(/а$/, '');
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear ? m : `${m} ${d.getFullYear()}`;
}

export function WorkoutHistoryScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { workouts, loaded } = useActivities();

  const totals = useMemo(() => ({
    count: workouts.length,
    distanceM: workouts.reduce((s, w) => s + w.distanceM, 0),
    durationSec: workouts.reduce((s, w) => s + w.durationSec, 0),
  }), [workouts]);

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; items: Workout[] }>();
    for (const w of workouts) {
      const k = monthKey(w.dateISO);
      const g = map.get(k);
      if (g) g.items.push(w);
      else map.set(k, { title: monthTitle(w.dateISO), items: [w] });
    }
    return Array.from(map.values());
  }, [workouts]);

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Назад')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Тренировки')}</Text>
          {totals.count > 0 ? (
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
              {pl.count(totals.count, 'тренировка', 'тренировки', 'тренировок')} · {formatDistance(totals.distanceM)} · {formatDuration(totals.durationSec)}
            </Text>
          ) : null}
        </View>

        {!loaded ? null : workouts.length === 0 ? (
          <EmptyState
            icon="figure.run"
            title={tr('Тренировок пока нет')}
            subtitle={tr('Запишите пробежку или прогулку — маршрут, темп и время сохранятся здесь.')}
            actionLabel={tr('Записать тренировку')}
            onAction={() => navigation.navigate('WorkoutTrack')}
          />
        ) : (
          groups.map((g) => (
            <ListSection key={g.title} header={g.title}>
              {g.items.map((w, i) => (
                <Row
                  key={w.id}
                  w={w}
                  last={i === g.items.length - 1}
                  onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })}
                />
              ))}
            </ListSection>
          ))
        )}

        <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}

function Row({ w, last, onPress }: { w: Workout; last: boolean; onPress: () => void }) {
  const { T, ty } = useTheme();
  const isRun = w.type === 'run';

  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${isRun ? tr('Пробежка') : tr('Ходьба')}, ${formatDistance(w.distanceM)}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1,
        })}
      >
        <RouteThumb coords={w.coords} width={72} height={72} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SF name={isRun ? 'figure.run' : 'figure.walk'} size={14} color={T.brand} />
            <Text style={[ty.caption1, { color: T.labelSecondary, flex: 1 }]} numberOfLines={1}>
              {whenLabel(w.dateISO)}
            </Text>
          </View>

          <Text style={[ty.title3, { color: T.label, marginTop: 2 }]} numberOfLines={1}>
            {formatDistance(w.distanceM)}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
            <Text style={[ty.caption1, nums, { color: T.labelSecondary }]} numberOfLines={1}>
              {formatDuration(w.durationSec)}
            </Text>
            <Text style={[ty.caption1, nums, { color: T.labelSecondary }]} numberOfLines={1}>
              {formatPace(w.distanceM, paceTimeSec(w))}/{tr('км')}
            </Text>
            <Text style={[ty.caption1, nums, { color: T.labelSecondary }]} numberOfLines={1}>
              ≈{fmtInt(w.steps)}
            </Text>
          </View>
        </View>

        {/* Засчитанную в челлендж тренировку помечаем: иначе непонятно, ушли ли
            её шаги в дневную норму. */}
        {w.addedToChallenge ? (
          <Capsule bg="rgba(52,199,89,0.16)" color={T.greenText}>✓</Capsule>
        ) : (
          <SF name="chevron.forward" size={13} color={T.labelTertiary} />
        )}
      </Pressable>
      {!last ? <View style={{ position: 'absolute', bottom: 0, left: 100, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
    </View>
  );
}
