// Физические показатели: программы на каждый день, рекорды из тренировок,
// цели, свои показатели и история забегов. Всем можно поделиться карточкой.
//
// Порядок разделов — по частоте использования: программа требует действия
// каждый день, поэтому она первая; рекорды и цели смотрят раз в неделю.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { ListSection, ProgressBar, Chip, PrimaryButton, Capsule } from '../../components/ui';
import { RouteThumb } from '../../components/RouteThumb';
import { hTap, hSuccess, hSelect } from '../../lib/haptics';
import { tr } from '../../state/LanguageContext';
import { useActivities, formatDistance, formatDuration, formatPace, paceTimeSec, Workout } from '../../state/ActivityContext';
import { useFitness } from '../../state/FitnessContext';
import {
  FitnessGoal, FitnessMetric, FitnessProgram, GoalKind, METRIC_PRESETS, PROGRAM_PRESETS, PROGRAM_DURATIONS,
  goalProgress, goalValueText, metricBest, metricLast, programStats, ProgramStats,
} from '../../data/fitness';
import { ProfileStackParams, ShareCard } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<ProfileStackParams, 'MyFitness'>;

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const km = (m: number) => `${(m / 1000).toFixed(m >= 100_000 ? 0 : 1).replace('.', ',')}`;
const hhmm = (t: { hour: number; minute: number }) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

const GOAL_KINDS: { kind: GoalKind; label: string; hint: string; unit: string }[] = [
  { kind: 'run_distance', label: 'Пробежать', hint: 'километров за одну тренировку', unit: 'км' },
  { kind: 'run_pace', label: 'Темп', hint: 'минут на километр, быстрее чем', unit: 'мин:сек' },
  { kind: 'week_km', label: 'За неделю', hint: 'километров бега и ходьбы', unit: 'км' },
  { kind: 'metric', label: 'Показатель', hint: 'значение своего показателя', unit: '' },
];

export function MyFitnessScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { workouts } = useActivities();
  const {
    goals, metrics, programs, records,
    addGoal, removeGoal, addMetric, removeMetric, logMetric,
    addProgram, removeProgram, logProgram, setProgramReminder,
  } = useFitness();

  const [goalSheet, setGoalSheet] = useState(false);
  const [metricSheet, setMetricSheet] = useState(false);
  const [programSheet, setProgramSheet] = useState(false);
  const [logFor, setLogFor] = useState<FitnessMetric | null>(null);
  const [openProgram, setOpenProgram] = useState<string | null>(null);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  const recent = useMemo(() => workouts.slice(0, 3), [workouts]);
  const share = (card: ShareCard) => navigation.navigate('WorkoutShare', { card });

  // Программы: активные сверху, завершённые ниже.
  const programRows = useMemo(() => programs.map((p) => ({ p, s: programStats(p) })), [programs]);
  const activePrograms = programRows.filter((r) => !r.s.finished);
  const finishedPrograms = programRows.filter((r) => r.s.finished);
  const todayLeft = activePrograms.filter((r) => r.s.dayIndex >= 1 && !r.s.todayDone).length;

  const recordCards: { key: string; icon: string; label: string; value: string; sub?: string; color: string; workout?: Workout | null; card: ShareCard }[] = [
    {
      key: 'longestRun', icon: 'figure.run', label: tr('Самая длинная пробежка'), color: T.brand,
      value: records.longestRun ? `${km(records.longestRun.distanceM)} км` : '—',
      sub: records.longestRun ? `${shortDate(records.longestRun.dateISO)} · ${formatPace(records.longestRun.distanceM, paceTimeSec(records.longestRun))}/км` : tr('пока нет'),
      workout: records.longestRun,
      card: { title: 'Рекорд', stats: [{ l: 'Самая длинная пробежка', v: records.longestRun ? `${km(records.longestRun.distanceM)} км` : '—' }] },
    },
    {
      key: 'fastestRun', icon: 'bolt.fill', label: tr('Лучший темп'), color: T.orange,
      value: records.fastestRun ? formatPace(records.fastestRun.distanceM, paceTimeSec(records.fastestRun)) : '—',
      sub: records.fastestRun ? `${km(records.fastestRun.distanceM)} км · ${shortDate(records.fastestRun.dateISO)}` : tr('от 1 км'),
      workout: records.fastestRun,
      card: { title: 'Рекорд', stats: [{ l: 'Лучший темп', v: records.fastestRun ? `${formatPace(records.fastestRun.distanceM, paceTimeSec(records.fastestRun)).replace('′', ':').replace('″', '')} /км` : '—' }] },
    },
    {
      key: 'longestWalk', icon: 'figure.walk', label: tr('Самая длинная прогулка'), color: T.green,
      value: records.longestWalk ? `${km(records.longestWalk.distanceM)} км` : '—',
      sub: records.longestWalk ? `${shortDate(records.longestWalk.dateISO)} · ${formatDuration(paceTimeSec(records.longestWalk))}` : tr('пока нет'),
      workout: records.longestWalk,
      card: { title: 'Рекорд', stats: [{ l: 'Самая длинная прогулка', v: records.longestWalk ? `${km(records.longestWalk.distanceM)} км` : '—' }] },
    },
    {
      key: 'total', icon: 'flame.fill', label: tr('Всего пройдено'), color: T.red,
      value: `${km(records.totalM)} км`,
      sub: `${pl.count(records.runs, 'пробежка', 'пробежки', 'пробежек')} · ${pl.count(records.walks, 'прогулка', 'прогулки', 'прогулок')}`,
      card: { title: 'Всего', stats: [{ l: 'Пройдено', v: `${km(records.totalM)} км` }, { l: 'Тренировок', v: String(records.runs + records.walks) }] },
    },
  ];

  const activeGoals = goals.filter((g) => !g.doneISO);
  const doneGoals = goals.filter((g) => g.doneISO);

  const confirmRemoveGoal = (g: FitnessGoal) => Alert.alert(tr('Удалить цель?'), g.title, [
    { text: tr('Отмена'), style: 'cancel' },
    { text: tr('Удалить'), style: 'destructive', onPress: () => removeGoal(g.id) },
  ]);
  const confirmRemoveMetric = (m: FitnessMetric) => Alert.alert(tr('Удалить показатель?'), `${m.name} — вся история значений будет удалена.`, [
    { text: tr('Отмена'), style: 'cancel' },
    { text: tr('Удалить'), style: 'destructive', onPress: () => removeMetric(m.id) },
  ]);
  const confirmRemoveProgram = (p: FitnessProgram) => Alert.alert(tr('Удалить программу?'), `${p.title} — история дней будет удалена, напоминание снято.`, [
    { text: tr('Отмена'), style: 'cancel' },
    { text: tr('Удалить'), style: 'destructive', onPress: () => { void removeProgram(p.id); setOpenProgram(null); } },
  ]);

  const opened = programRows.find((r) => r.p.id === openProgram) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {/* Шапка: градиент от самого верха, навбар поверх него прозрачный —
            как на странице челленджа. Сплошной цветной блок под белым навбаром
            выглядел приклеенным. */}
        <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <NavHeader transparent tint="#fff" backLabel={tr('Профиль')} onBack={() => navigation.goBack()} />
          <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 22, position: 'relative' }}>
            <View style={{ position: 'absolute', right: 6, top: -10, opacity: 0.16 }}>
              <SF name="figure.run" size={130} color="#fff" />
            </View>
            <Text style={[ty.caption1, { color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6 }]}>{tr('Физические показатели')}</Text>
            <Text style={[ty.largeTitle, { color: '#fff', marginTop: 2 }]} numberOfLines={1}>{tr('Мои тренировки')}</Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              {[
                { v: km(records.weekM), l: tr('км за неделю') },
                { v: String(records.runs + records.walks), l: tr('тренировок') },
                { v: todayLeft > 0 ? String(todayLeft) : '✓', l: todayLeft > 0 ? tr('на сегодня') : tr('всё сделано') },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1 }}>
                  <Text style={[ty.title2, { color: '#fff' }]} numberOfLines={1}>{s.v}</Text>
                  <Text style={[ty.caption2, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>{s.l}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <HeroButton icon="figure.run" label={tr('Записать бег')} onPress={() => navigation.navigate('WorkoutTrack')} solid />
              <HeroButton icon="clock.arrow.circlepath" label={tr('История')} onPress={() => navigation.navigate('WorkoutHistory')} />
            </View>
          </View>
        </LinearGradient>

        {/* Программы */}
        <SectionTitle title={tr('Программы')} action={tr('Новая')} onAction={() => { hTap(); setProgramSheet(true); }} first />
        {programs.length === 0 ? (
          <Hint
            icon="calendar"
            title={tr('Каждый день — одно действие')}
            text={tr('Например, 30 отжиманий каждое утро 21 день. Приложение напомнит в выбранное время, посчитает сделанные и пропущенные дни и серию.')}
            action={tr('Составить программу')}
            onAction={() => setProgramSheet(true)}
          />
        ) : (
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            {[...activePrograms, ...finishedPrograms].map(({ p, s }) => (
              <ProgramCard key={p.id} p={p} s={s}
                onOpen={() => setOpenProgram(p.id)}
                onDone={() => { hSuccess(); logProgram(p.id, p.target); }}
              />
            ))}
          </View>
        )}

        {/* Рекорды */}
        <SectionTitle title={tr('Рекорды')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 11 }}>
          {recordCards.map((r) => (
            <View key={r.key} style={{ width: '50%', padding: 5 }}>
              <Pressable
                onPress={() => { if (r.workout) navigation.navigate('WorkoutDetail', { workoutId: r.workout.id }); }}
                onLongPress={() => { hTap(); share(r.card); }}
                accessibilityRole="button" accessibilityLabel={`${r.label}: ${r.value}`}
                style={({ pressed }) => ({ backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', padding: 14, minHeight: 124, borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.8 : 1 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, borderCurve: 'continuous', backgroundColor: `${r.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                    <SF name={r.icon} size={16} color={r.color} />
                  </View>
                  <Pressable onPress={() => share(r.card)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Поделиться')}>
                    <SF name="square.and.arrow.up" size={15} color={T.labelTertiary} />
                  </Pressable>
                </View>
                <Text style={[ty.title2, { color: T.label, marginTop: 10 }]} numberOfLines={1} adjustsFontSizeToFit>{r.value}</Text>
                <Text style={[ty.caption1, { color: T.label, marginTop: 2 }]} numberOfLines={1}>{r.label}</Text>
                {r.sub ? <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{r.sub}</Text> : null}
              </Pressable>
            </View>
          ))}
        </View>

        {/* Цели */}
        <SectionTitle title={tr('Цели')} action={tr('Добавить')} onAction={() => { hTap(); setGoalSheet(true); }} />
        {goals.length === 0 ? (
          <Hint icon="target" title={tr('Поставьте цель')} text={tr('Пробежать десятку, выйти из 5:00 на километре или подтянуться пятнадцать раз. Прогресс считается сам по тренировкам и показателям.')} action={tr('Добавить цель')} onAction={() => setGoalSheet(true)} />
        ) : (
          <ListSection>
            {[...activeGoals, ...doneGoals].map((g, i, arr) => {
              const p = goalProgress(g, records, metrics);
              const metric = g.kind === 'metric' ? metrics.find((m) => m.id === g.metricId) : undefined;
              const unit = metric?.unit;
              const done = !!g.doneISO;
              return (
                <Pressable key={g.id} onLongPress={() => confirmRemoveGoal(g)} accessibilityRole="button" accessibilityLabel={g.title}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 8, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: T.separator, opacity: done ? 0.85 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <SF name={done ? 'checkmark.seal.fill' : 'target'} size={18} color={done ? T.green : T.brand} />
                    <Text style={[ty.body, { color: T.label, flex: 1 }]} numberOfLines={1}>{g.title}</Text>
                    {done ? <Capsule bg="rgba(52,199,89,0.16)" color={T.greenText}>{tr('достигнута')}</Capsule> : null}
                    <Pressable onPress={() => share({
                      title: done ? 'Цель достигнута' : 'Моя цель',
                      stats: [{ l: g.title, v: goalValueText(g.kind, g.target, unit) }, ...(done ? [] : [{ l: 'Сейчас', v: goalValueText(g.kind, p.current, unit) }])],
                    })} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Поделиться')}>
                      <SF name="square.and.arrow.up" size={15} color={T.labelTertiary} />
                    </Pressable>
                  </View>
                  <ProgressBar value={done ? 1 : p.ratio} color={done ? T.green : T.brand} height={6} accessibilityLabel={g.title} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('сейчас')} {goalValueText(g.kind, p.current, unit)}</Text>
                    <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('цель')} {goalValueText(g.kind, g.target, unit)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ListSection>
        )}

        {/* Свои показатели */}
        <SectionTitle title={tr('Показатели')} action={tr('Добавить')} onAction={() => { hTap(); setMetricSheet(true); }} />
        {metrics.length === 0 ? (
          <Hint icon="dumbbell" title={tr('Личные рекорды')} text={tr('Турник, отжимания, планка, вес — всё, что хочется отслеживать. Записывайте результат, рекорд считается сам.')} action={tr('Добавить показатель')} onAction={() => setMetricSheet(true)} />
        ) : (
          <ListSection>
            {metrics.map((m, i) => {
              const best = metricBest(m);
              const last = metricLast(m);
              const open = openMetric === m.id;
              return (
                <View key={m.id} style={{ borderBottomWidth: i < metrics.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                  <Pressable onPress={() => setOpenMetric(open ? null : m.id)} onLongPress={() => confirmRemoveMetric(m)} accessibilityRole="button" accessibilityLabel={m.name} accessibilityState={{ expanded: open }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name="dumbbell" size={17} color={T.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                        {last ? `${tr('последний')} ${last.value} ${m.unit} · ${shortDate(last.dateISO)}` : tr('записей пока нет')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{best != null ? `${best} ${m.unit}` : '—'}</Text>
                      <Text style={[ty.caption2, { color: T.labelTertiary }]}>{tr('рекорд')}</Text>
                    </View>
                    <Pressable onPress={() => { hTap(); setLogFor(m); }} accessibilityRole="button" accessibilityLabel={`${tr('Записать')} ${m.name}`}
                      style={{ width: 36, height: 36, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name="plus" size={16} color={T.onBrand} />
                    </Pressable>
                  </Pressable>
                  {open ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
                      {[...m.entries].sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO)).slice(0, 8).map((e) => (
                        <View key={e.dateISO} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[ty.caption1, { color: T.labelSecondary }]}>{shortDate(e.dateISO)}</Text>
                          <Text style={[ty.caption1, { color: e.value === best ? T.brand : T.label }]}>{e.value} {m.unit}{e.value === best ? ' 🏆' : ''}</Text>
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                        <Chip label={tr('Поделиться рекордом')} icon="square.and.arrow.up" onPress={() => best != null && share({ title: 'Рекорд', stats: [{ l: m.name, v: `${best} ${m.unit}` }] })} />
                        <Chip label={tr('Цель')} icon="target" onPress={() => setGoalSheet(true)} />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ListSection>
        )}

        {/* Последние забеги */}
        <SectionTitle title={tr('Последние тренировки')} action={workouts.length > 0 ? tr('Все') : undefined} onAction={() => navigation.navigate('WorkoutHistory')} />
        {recent.length === 0 ? (
          <Hint icon="figure.run" title={tr('Первая пробежка')} text={tr('Нажмите «Записать бег» — маршрут, темп и время сохранятся здесь.')} action={tr('Записать')} onAction={() => navigation.navigate('WorkoutTrack')} />
        ) : (
          <ListSection>
            {recent.map((w, i) => (
              <Pressable key={w.id} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: i < recent.length - 1 ? 0.5 : 0, borderBottomColor: T.separator, opacity: pressed ? 0.7 : 1 })}>
                <RouteThumb coords={w.coords} width={54} height={54} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>{w.type === 'run' ? tr('Пробежка') : tr('Ходьба')} · {formatDistance(w.distanceM)}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                    {shortDate(w.dateISO)} · {formatDuration(paceTimeSec(w))} · {formatPace(w.distanceM, paceTimeSec(w))}/км
                  </Text>
                </View>
                <SF name="chevron.right" size={13} color={T.labelTertiary} />
              </Pressable>
            ))}
          </ListSection>
        )}
      </ScrollView>

      <ProgramSheet visible={programSheet} onClose={() => setProgramSheet(false)} onAdd={async (p) => { setProgramSheet(false); await addProgram(p); hSuccess(); }} />
      <ProgramDetail
        row={opened}
        onClose={() => setOpenProgram(null)}
        onLog={(v) => opened && logProgram(opened.p.id, v)}
        onRemind={(t) => opened && setProgramReminder(opened.p.id, t)}
        onRemove={() => opened && confirmRemoveProgram(opened.p)}
        onShare={() => {
          if (!opened) return;
          const { p, s } = opened;
          share({
            title: s.finished ? 'Программа пройдена' : 'Моя программа',
            stats: [{ l: `${p.title} · каждый день`, v: `${p.target} ${p.unit}` }, { l: 'Дней сделано', v: `${s.done} из ${p.days}` }, { l: 'Серия', v: pl.days(s.streak) }],
          });
        }}
      />
      <GoalSheet visible={goalSheet} onClose={() => setGoalSheet(false)} metrics={metrics} onAdd={(g) => { addGoal(g); hSuccess(); setGoalSheet(false); }} />
      <MetricSheet visible={metricSheet} onClose={() => setMetricSheet(false)} onAdd={(m) => { addMetric(m); hSuccess(); setMetricSheet(false); }} />
      <LogSheet metric={logFor} onClose={() => setLogFor(null)} onLog={(v) => { if (logFor) { logMetric(logFor.id, v); hSuccess(); } setLogFor(null); }} />
    </View>
  );
}

// ─── Программа: карточка ──────────────────────────────────────────────────────

function ProgramCard({ p, s, onOpen, onDone }: { p: FitnessProgram; s: ProgramStats; onOpen: () => void; onDone: () => void }) {
  const { T, ty } = useTheme();
  const notStarted = s.dayIndex < 1;
  const ratio = p.days > 0 ? s.done / p.days : 0;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={p.title}
      style={({ pressed }) => ({ backgroundColor: T.cardBg, borderRadius: 18, borderCurve: 'continuous', padding: 14, borderWidth: 0.5, borderColor: T.cardBorder, opacity: pressed ? 0.85 : 1, gap: 10 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, borderCurve: 'continuous', backgroundColor: s.finished ? 'rgba(52,199,89,0.16)' : T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={s.finished ? 'checkmark.seal.fill' : 'flame.fill'} size={19} color={s.finished ? T.green : T.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{p.title} · {p.target} {p.unit}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
            {s.finished ? `${tr('Завершена')} · ${s.done} ${tr('из')} ${p.days}` : notStarted ? tr('Начнётся завтра') : `${tr('День')} ${s.dayIndex} ${tr('из')} ${p.days}`}
            {p.remindAt ? ` · 🔔 ${hhmm(p.remindAt)}` : ''}
          </Text>
        </View>
        {!s.finished && !notStarted ? (
          s.todayDone ? (
            <Capsule bg="rgba(52,199,89,0.16)" color={T.greenText}>{tr('сегодня ✓')}</Capsule>
          ) : (
            <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel={`${tr('Сделал')}: ${p.title}`}
              style={({ pressed }) => ({ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brand, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
              <SF name="checkmark" size={14} color={T.onBrand} />
              <Text style={[ty.subheadEm, { color: T.onBrand }]}>{tr('Сделал')}</Text>
            </Pressable>
          )
        ) : null}
      </View>

      {/* Полоска дней: одна клетка — один день. Читается быстрее любого текста. */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {s.grid.map((g) => (
          <View key={g.key} style={{
            flex: 1, height: 8, borderRadius: 3,
            borderCurve: 'continuous',
            backgroundColor: g.state === 'done' ? T.green : g.state === 'missed' ? T.red : g.state === 'partial' ? T.orange : g.state === 'today' ? T.brand : T.fillTertiary,
            opacity: g.state === 'today' ? 0.55 : 1,
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('сделано')} {s.done} · {tr('пропущено')} <Text style={{ color: s.missed ? T.redText : T.labelSecondary }}>{s.missed}</Text></Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{s.streak > 0 ? `🔥 ${pl.days(s.streak)} ${tr('подряд')}` : `${Math.round(ratio * 100)}%`}</Text>
      </View>
    </Pressable>
  );
}

// ─── Программа: подробности ───────────────────────────────────────────────────

const REMIND_PRESETS: { hour: number; minute: number }[] = [
  { hour: 7, minute: 0 }, { hour: 8, minute: 0 }, { hour: 9, minute: 0 }, { hour: 12, minute: 0 }, { hour: 19, minute: 0 }, { hour: 21, minute: 0 },
];

function ProgramDetail({ row, onClose, onLog, onRemind, onRemove, onShare }: {
  row: { p: FitnessProgram; s: ProgramStats } | null;
  onClose: () => void; onLog: (v: number) => void; onRemind: (t: FitnessProgram['remindAt']) => void; onRemove: () => void; onShare: () => void;
}) {
  const { T, ty } = useTheme();
  const [draft, setDraft] = useState('');
  if (!row) return null;
  const { p, s } = row;
  const color = (st: ProgramStats['grid'][number]['state']) =>
    st === 'done' ? { bg: 'rgba(52,199,89,0.18)', fg: T.greenText } :
    st === 'missed' ? { bg: 'rgba(255,59,48,0.16)', fg: T.redText } :
    st === 'partial' ? { bg: 'rgba(255,149,0,0.18)', fg: T.orangeText } :
    st === 'today' ? { bg: T.brandTinted, fg: T.brand } : { bg: T.fillTertiary, fg: T.labelTertiary };

  const submit = () => {
    const n = Number(draft.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) { Alert.alert(tr('Введите число')); return; }
    onLog(n); setDraft(''); hSuccess();
  };

  return (
    <Sheet visible title={`${p.title} · ${p.target} ${p.unit}`} onClose={onClose}
      trailing={<Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Удалить программу')}><SF name="trash.fill" size={17} color={T.red} /></Pressable>}>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>
        {s.finished ? tr('Программа завершена') : s.dayIndex < 1 ? tr('Начнётся завтра') : `${tr('День')} ${s.dayIndex} ${tr('из')} ${p.days}`}
        {' · '}{tr('сделано')} {s.done} · {tr('пропущено')} {s.missed}{s.streak > 0 ? ` · 🔥 ${pl.days(s.streak)}` : ''}
      </Text>

      {/* Сетка дней */}
      <View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous', padding: 12, borderWidth: 0.5, borderColor: T.cardBorder }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {s.grid.map((g) => {
            const c = color(g.state);
            return (
              <View key={g.key} style={{ width: 38, height: 38, borderRadius: 10, borderCurve: 'continuous', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', borderWidth: g.state === 'today' || g.state === 'partial' ? 1.5 : 0, borderColor: T.brand }}>
                <Text style={[ty.caption1, { color: c.fg, fontFamily: ty.subheadEm.fontFamily }]}>{g.index}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {([['done', tr('сделано')], ['missed', tr('пропуск')], ['partial', tr('частично')], ['today', tr('сегодня')]] as const).map(([st, l]) => (
            <View key={st} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, borderCurve: 'continuous', backgroundColor: color(st).bg }} />
              <Text style={[ty.caption2, { color: T.labelSecondary }]}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Сегодня */}
      {!s.finished && s.dayIndex >= 1 ? (
        <View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous', padding: 14, gap: 10, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <Text style={[ty.subheadEm, { color: T.label }]}>{tr('Сегодня')}: {s.todayValue} / {p.target} {p.unit}{s.todayDone ? ' ✓' : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={draft} onChangeText={setDraft} placeholder={String(p.target)} placeholderTextColor={T.labelTertiary} keyboardType="decimal-pad" accessibilityLabel={tr('Сколько сделали')}
              style={[ty.body, { flex: 1, color: T.label, backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous', minHeight: 44, paddingHorizontal: 14 }]} />
            <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel={tr('Записать')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[ty.subheadEm, { color: T.brand }]}>{tr('Записать')}</Text>
            </Pressable>
            {!s.todayDone ? (
              <Pressable onPress={() => { onLog(p.target); hSuccess(); }} accessibilityRole="button" accessibilityLabel={tr('Сделал норму')} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.subheadEm, { color: T.onBrand }]}>{tr('Сделал')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Напоминание */}
      {!s.finished ? (
        <View style={{ backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous', padding: 14, gap: 10, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SF name="bell.fill" size={15} color={T.brand} />
            <Text style={[ty.subheadEm, { color: T.label, flex: 1 }]}>{tr('Напоминание')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]}>{p.remindAt ? hhmm(p.remindAt) : tr('выключено')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REMIND_PRESETS.map((t) => {
              const on = !!p.remindAt && p.remindAt.hour === t.hour && p.remindAt.minute === t.minute;
              return <Chip key={hhmm(t)} label={hhmm(t)} active={on} onPress={() => { hSelect(); onRemind(on ? null : t); }} />;
            })}
            <Chip label={tr('Выкл.')} active={!p.remindAt} onPress={() => { hSelect(); onRemind(null); }} />
          </View>
        </View>
      ) : null}

      <PrimaryButton label={tr('Поделиться')} icon="square.and.arrow.up" onPress={onShare} />
    </Sheet>
  );
}

// ─── Программа: создание ──────────────────────────────────────────────────────

function ProgramSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (p: { title: string; unit: string; target: number; days: number; remindAt: { hour: number; minute: number } | null }) => void }) {
  const { T, ty } = useTheme();
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('раз');
  const [target, setTarget] = useState('30');
  const [days, setDays] = useState(21);
  const [remind, setRemind] = useState<{ hour: number; minute: number } | null>({ hour: 8, minute: 0 });

  const submit = () => {
    const n = Number(target.replace(',', '.'));
    if (!title.trim()) { Alert.alert(tr('Что делать каждый день?'), tr('Например, «Отжимания».')); return; }
    if (!Number.isFinite(n) || n <= 0) { Alert.alert(tr('Укажите норму на день'), tr('Например, 30.')); return; }
    onAdd({ title: title.trim(), unit: unit.trim() || 'раз', target: n, days, remindAt: remind });
    setTitle(''); setUnit('раз'); setTarget('30'); setDays(21);
  };

  return (
    <Sheet visible={visible} title={tr('Новая программа')} onClose={onClose}>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Одно действие каждый день. Пропуск считается, серия — тоже.')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PROGRAM_PRESETS.map((pr) => <Chip key={pr.title} label={`${pr.title} ${pr.target}`} active={title === pr.title} onPress={() => { setTitle(pr.title); setUnit(pr.unit); setTarget(String(pr.target)); }} />)}
      </View>
      <Field label={tr('Что делать')} value={title} onChange={setTitle} placeholder={tr('Отжимания')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={tr('Норма в день')} value={target} onChange={setTarget} placeholder="30" keyboard="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label={tr('Единица')} value={unit} onChange={setUnit} placeholder="раз" /></View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Сколько дней')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PROGRAM_DURATIONS.map((d) => <Chip key={d} label={pl.days(d)} active={days === d} onPress={() => setDays(d)} />)}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Напоминать каждый день в')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REMIND_PRESETS.map((t) => {
            const on = !!remind && remind.hour === t.hour && remind.minute === t.minute;
            return <Chip key={hhmm(t)} label={hhmm(t)} active={on} onPress={() => setRemind(t)} />;
          })}
          <Chip label={tr('Без напоминания')} active={!remind} onPress={() => setRemind(null)} />
        </View>
      </View>
      <PrimaryButton label={tr('Начать с сегодня')} icon="flame.fill" onPress={submit} />
    </Sheet>
  );
}

// ─── Мелкие части ─────────────────────────────────────────────────────────────

function SectionTitle({ title, action, onAction, first }: { title: string; action?: string; onAction?: () => void; first?: boolean }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: first ? 18 : 24, paddingBottom: 10 }}>
      <Text accessibilityRole="header" style={[ty.title3, { color: T.label, flex: 1 }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.5 : 1, minHeight: 32, paddingHorizontal: 10, borderRadius: 10, borderCurve: 'continuous', backgroundColor: T.brandTinted })}>
          <SF name="plus" size={13} color={T.brand} />
          <Text style={[ty.subheadEm, { color: T.brand }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Hint({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action?: string; onAction?: () => void }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
          <SF name={icon} size={16} color={T.brand} />
        </View>
        <Text style={[ty.headline, { color: T.label, flex: 1 }]}>{title}</Text>
      </View>
      <Text style={[ty.subhead, { color: T.labelSecondary }]}>{text}</Text>
      {action && onAction ? (
        <Pressable onPress={() => { hTap(); onAction(); }} accessibilityRole="button" accessibilityLabel={action} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Text style={[ty.subheadEm, { color: T.onBrand }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HeroButton({ icon, label, onPress, solid }: { icon: string; label: string; onPress: () => void; solid?: boolean }) {
  const { ty } = useTheme();
  return (
    <Pressable onPress={() => { hTap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 13, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: solid ? '#fff' : 'rgba(255,255,255,0.18)', opacity: pressed ? 0.8 : 1 })}>
      <SF name={icon} size={16} color={solid ? '#234088' : '#fff'} />
      <Text style={[ty.subheadEm, { color: solid ? '#234088' : '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Общая шторка снизу. */
function Sheet({ visible, title, onClose, children, trailing }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; trailing?: React.ReactNode }) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  // Высота в пикселях, а не в процентах: процент Yoga не всегда может
  // разрешить, и тогда список получает высоту содержимого — крутится внутри,
  // но целиком не помещается, и хвост недостижим.
  const { height } = useWindowDimensions();
  const sheetMax = Math.round(height * 0.86);
  const listMax = sheetMax - 110 - insets.bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Затемнение — слоем ПОД шторкой, а не её родителем: Pressable вокруг
              прокручиваемого содержимого забирает жест себе, и список внутри
              перестаёт крутиться. */}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('Закрыть')}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          <View style={{ backgroundColor: T.groupedBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderCurve: 'continuous', paddingBottom: insets.bottom + 12, maxHeight: sheetMax }}>
            <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 38, height: 4, borderRadius: 2, borderCurve: 'continuous', backgroundColor: T.fillTertiary }} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
              <Text style={[ty.title3, { color: T.label, flex: 1 }]} numberOfLines={1}>{title}</Text>
              {trailing}
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled" style={{ maxHeight: listMax }}>{children}</ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, keyboard = 'default' }: { label: string; value: string; onChange: (t: string) => void; placeholder?: string; keyboard?: 'default' | 'decimal-pad' | 'numbers-and-punctuation' }) {
  const { T, ty } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[ty.caption1, { color: T.labelSecondary }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={T.labelTertiary} keyboardType={keyboard} accessibilityLabel={label}
        style={[ty.body, { color: T.label, backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', minHeight: 46, paddingHorizontal: 14, borderWidth: 0.5, borderColor: T.cardBorder }]} />
    </View>
  );
}

/** «5:30» → 330 секунд; «5.5» → 330; мусор → null. */
export function parsePace(input: string): number | null {
  const s = input.trim().replace(',', '.');
  const m = /^(\d{1,2})[:′'](\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return Math.round(n * 60);
  return null;
}

function GoalSheet({ visible, onClose, metrics, onAdd }: { visible: boolean; onClose: () => void; metrics: FitnessMetric[]; onAdd: (g: Omit<FitnessGoal, 'id' | 'createdISO'>) => void }) {
  const { T, ty } = useTheme();
  const [kind, setKind] = useState<GoalKind>('run_distance');
  const [value, setValue] = useState('');
  const [metricId, setMetricId] = useState<string | null>(null);
  const spec = GOAL_KINDS.find((k) => k.kind === kind)!;
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const submit = () => {
    let target: number | null = null;
    let title = '';
    if (kind === 'run_pace') {
      target = parsePace(value);
      if (target) title = `Темп быстрее ${goalValueText('run_pace', target)}`;
    } else if (kind === 'metric') {
      if (!metric) { Alert.alert(tr('Сначала добавьте показатель'), tr('Цель по показателю ставится на уже созданный показатель — турник, планку, вес.')); return; }
      const n = Number(value.replace(',', '.'));
      if (Number.isFinite(n) && n > 0) { target = n; title = `${metric.name}: ${goalValueText('metric', n, metric.unit)}`; }
    } else {
      const n = Number(value.replace(',', '.'));
      if (Number.isFinite(n) && n > 0) { target = Math.round(n * 1000); title = kind === 'run_distance' ? `Пробежать ${goalValueText('run_distance', target)}` : `${goalValueText('week_km', target)} за неделю`; }
    }
    if (!target) { Alert.alert(tr('Укажите цель'), kind === 'run_pace' ? tr('Например, 5:30') : tr('Введите число.')); return; }
    onAdd({ kind, title, target, metricId: kind === 'metric' ? metric?.id : undefined });
    setValue('');
  };

  return (
    <Sheet visible={visible} title={tr('Новая цель')} onClose={onClose}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GOAL_KINDS.map((k) => <Chip key={k.kind} label={k.label} active={kind === k.kind} onPress={() => setKind(k.kind)} />)}
      </View>
      {kind === 'metric' ? (
        metrics.length === 0
          ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Показателей пока нет — добавьте в разделе «Показатели».')}</Text>
          : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{metrics.map((m) => <Chip key={m.id} label={m.name} active={metric?.id === m.id} onPress={() => setMetricId(m.id)} />)}</View>
      ) : null}
      <Field label={`${spec.hint}${kind === 'metric' && metric ? ` (${metric.unit})` : spec.unit ? ` (${spec.unit})` : ''}`} value={value} onChange={setValue} placeholder={kind === 'run_pace' ? '5:30' : '10'} keyboard={kind === 'run_pace' ? 'numbers-and-punctuation' : 'decimal-pad'} />
      <PrimaryButton label={tr('Поставить цель')} icon="target" onPress={submit} />
    </Sheet>
  );
}

function MetricSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (m: Omit<FitnessMetric, 'id' | 'entries'>) => void }) {
  const { T, ty } = useTheme();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('раз');
  const [direction, setDirection] = useState<'max' | 'min'>('max');

  const submit = () => {
    if (!name.trim()) { Alert.alert(tr('Как назвать показатель?'), tr('Например, «Подтягивания».')); return; }
    onAdd({ name: name.trim(), unit: unit.trim() || 'раз', direction });
    setName(''); setUnit('раз'); setDirection('max');
  };

  return (
    <Sheet visible={visible} title={tr('Новый показатель')} onClose={onClose}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {METRIC_PRESETS.map((p) => <Chip key={p.name} label={p.name} active={name === p.name} onPress={() => { setName(p.name); setUnit(p.unit); setDirection(p.direction); }} />)}
      </View>
      <Field label={tr('Название')} value={name} onChange={setName} placeholder={tr('Подтягивания')} />
      <Field label={tr('Единица')} value={unit} onChange={setUnit} placeholder="раз" />
      <View style={{ gap: 6 }}>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Что считать рекордом')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label={tr('Больше — лучше')} active={direction === 'max'} onPress={() => setDirection('max')} />
          <Chip label={tr('Меньше — лучше')} active={direction === 'min'} onPress={() => setDirection('min')} />
        </View>
      </View>
      <PrimaryButton label={tr('Добавить')} icon="plus" onPress={submit} />
    </Sheet>
  );
}

function LogSheet({ metric, onClose, onLog }: { metric: FitnessMetric | null; onClose: () => void; onLog: (v: number) => void }) {
  const { T, ty } = useTheme();
  const [value, setValue] = useState('');
  const best = metric ? metricBest(metric) : null;
  const submit = () => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) { Alert.alert(tr('Введите число')); return; }
    onLog(n);
    setValue('');
  };
  return (
    <Sheet visible={!!metric} title={metric ? `${tr('Записать')}: ${metric.name}` : ''} onClose={onClose}>
      {best != null ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Текущий рекорд')}: {best} {metric?.unit}</Text> : null}
      <Field label={`${tr('Результат')} (${metric?.unit ?? ''})`} value={value} onChange={setValue} placeholder="12" keyboard="decimal-pad" />
      <PrimaryButton label={tr('Сохранить')} icon="checkmark" onPress={submit} />
    </Sheet>
  );
}
