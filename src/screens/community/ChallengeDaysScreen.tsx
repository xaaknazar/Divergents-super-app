// Дни челленджа: календарь прошедших дней и результат каждого — свой и командный.
//
// Раньше человек видел только сегодня. Понять, за какой день прилетел флаг и
// сколько баллов принесла пятница, было негде — приходилось спрашивать
// капитана. А капитану — обходить команду по одному. Поэтому здесь два среза
// одной и той же истории: «Я» и «Команда».
//
// Разбор считает тот же зачёт, что и баллы (challenge-scoring на сервере), а не
// отдельная формула: экран истории и таблица разойтись не могут.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, Segmented } from '../../components/ui';
import { MemberAvatar } from '../../components/MemberAvatar';
import { EmptyState } from '../../components/StateViews';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { ChallengeDay, MemberDay, totalFlags, flagsToEliminate } from '../../data/community';
import { fmtInt } from '../../data/format';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeDays'>;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function dayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Состояние дня решает цвет плитки — по нему картина читается за секунду. */
type DayState = 'clean' | 'flagged' | 'missed' | 'today' | 'future' | 'left';

function stateOf(d: MemberDay | undefined): DayState {
  if (!d) return 'future';
  // День выхода по белому флагу 🏳️ — закрыт, но не судится. Без этой ветки он
  // проваливался в «не отмечался» и горел красным, хотя штрафа за него нет.
  if (d.left) return 'left';
  if (!d.past) return 'today';
  if (!d.reported) return 'missed';
  return totalFlags(d.flags) > 0 ? 'flagged' : 'clean';
}

/** Сводка команды за один день: из чего он сложился у всех сразу. */
interface TeamDay {
  day: number;
  dateISO: string;
  past: boolean;
  /** Сколько человек отметились вовремя. */
  reported: number;
  /** Сколько закрыли все три нормы. */
  clean: number;
  /** Всего участников с данными за этот день. */
  size: number;
  flags: number;
  positive: number;
  penalty: number;
}

/** Один участник в разборе командного дня. */
interface TeamDayRow {
  id: string;
  name: string;
  avatar?: string | null;
  eliminated?: boolean;
  /** Вышел по белому флагу 🏳️ — нормы этого дня с него уже не спрашиваются. */
  left?: boolean;
  isMe?: boolean;
  d: MemberDay | undefined;
}

export function ChallengeDaysScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { challenge, leaderboard } = useChallenge();
  const myDays = challenge.myDays ?? [];
  const maxFlags = flagsToEliminate(challenge.rules);

  // Дата дня — общая для всех, поэтому она приходит один раз, в своей истории,
  // и здесь раздаётся по номеру дня. Команде свои копии той же строки не нужны.
  const dateByDay = useMemo(
    () => new Map(myDays.map((d) => [d.day, d.dateISO])),
    [myDays],
  );

  // Командная история есть, только если сервер отдал разбор по дням хотя бы
  // одному участнику: на старом сервере вкладку прятать честнее, чем показывать
  // пустой календарь и оставлять человека гадать, что сломалось.
  const teamHasDays = useMemo(
    () => leaderboard.some((m) => (m.days?.length ?? 0) > 0),
    [leaderboard],
  );

  const [scope, setScope] = useState<0 | 1>(0);
  const team = scope === 1 && teamHasDays;

  const [openDay, setOpenDay] = useState<number | null>(null);

  const total = challenge.totalDays || myDays.length;

  const teamDays = useMemo<TeamDay[]>(() => {
    if (!teamHasDays) return [];
    const acc = new Map<number, TeamDay>();
    for (const m of leaderboard) {
      for (const d of m.days ?? []) {
        const t = acc.get(d.day) ?? {
          day: d.day, dateISO: dateByDay.get(d.day) ?? '', past: d.past,
          reported: 0, clean: 0, size: 0, flags: 0, positive: 0, penalty: 0,
        };
        // День выхода по белому флагу 🏳️ не судится: заработанное в него
        // остаётся в копилке команды, но в «сколько человек закрыли день»
        // человек больше не входит — норм с него в этот день уже не спрашивают.
        // Иначе двадцатый участник вечно висел бы в «не закрыли», а команда
        // читала это как свой провал.
        if (d.left) {
          t.positive += d.positive;
          t.penalty += d.penalty;
          acc.set(d.day, t);
          continue;
        }
        t.size += 1;
        if (d.reported) t.reported += 1;
        if (d.past && d.reported && totalFlags(d.flags) === 0) t.clean += 1;
        t.flags += totalFlags(d.flags);
        t.positive += d.positive;
        t.penalty += d.penalty;
        acc.set(d.day, t);
      }
    }
    return [...acc.values()].sort((a, b) => a.day - b.day);
  }, [leaderboard, teamHasDays, dateByDay]);

  const myByDay = useMemo(() => new Map(myDays.map((d) => [d.day, d])), [myDays]);
  const teamByDay = useMemo(() => new Map(teamDays.map((d) => [d.day, d])), [teamDays]);

  const shownDays = team ? teamDays : myDays;

  const summary = useMemo(() => {
    if (team) {
      const past = teamDays.filter((d) => d.past);
      return {
        clean: past.reduce((s, d) => s + d.clean, 0),
        problem: past.reduce((s, d) => s + (d.size - d.clean), 0),
        points: teamDays.reduce((s, d) => s + d.positive, 0),
        penalty: teamDays.reduce((s, d) => s + d.penalty, 0),
      };
    }
    // День выхода по белому флагу закрыт, но не судится — ни в «чистые», ни в
    // «проблемные» он не идёт.
    const past = myDays.filter((d) => d.past && !d.left);
    return {
      clean: past.filter((d) => d.reported && totalFlags(d.flags) === 0).length,
      problem: past.filter((d) => !d.reported || totalFlags(d.flags) > 0).length,
      points: myDays.reduce((s, d) => s + d.positive, 0),
      penalty: myDays.reduce((s, d) => s + d.penalty, 0),
    };
  }, [team, teamDays, myDays]);

  const tile = (state: DayState) => {
    if (state === 'clean') return { bg: 'rgba(52,199,89,0.18)', fg: T.greenText };
    if (state === 'flagged') return { bg: 'rgba(255,59,48,0.14)', fg: T.redText };
    if (state === 'missed') return { bg: 'rgba(255,59,48,0.28)', fg: T.redText };
    if (state === 'today') return { bg: T.brandTinted, fg: T.brand };
    if (state === 'left') return { bg: T.fillSecondary, fg: T.labelSecondary };
    return { bg: T.fillTertiary, fg: T.labelTertiary };
  };

  /**
   * Цвет командной плитки. Не «есть флаги / нет флагов»: в команде из двадцати
   * человек один флаг — обычный день, а половина команды в флагах — беда, и
   * одинаковым красным их путать нельзя. Считаем долю тех, кто день не закрыл.
   */
  const teamTile = (t: TeamDay | undefined) => {
    if (!t) return tile('future');
    if (!t.past) return tile('today');
    const bad = t.size - t.clean;
    if (bad === 0) return tile('clean');
    return bad / Math.max(1, t.size) >= 0.5 ? tile('missed') : tile('flagged');
  };

  const rowsForDay = (day: number): TeamDayRow[] => leaderboard
    .map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      eliminated: m.eliminated,
      left: m.left,
      isMe: m.isMe,
      d: (m.days ?? []).find((x) => x.day === day),
    }))
    // Проблемы сверху: капитан открывает этот список, чтобы найти, кому
    // написать, а не чтобы полюбоваться отличниками.
    .sort((a, b) => {
      const rank = (r: TeamDayRow) => {
        // Вышедший внизу: капитан открывает список, чтобы найти, кому написать,
        // а этому человеку писать уже незачем.
        if (r.left) return -1;
        if (!r.d) return 0;
        if (r.d.past && !r.d.reported) return 3;
        if (totalFlags(r.d.flags) > 0) return 2;
        return 1;
      };
      const rb = rank(b) - rank(a);
      if (rb !== 0) return rb;
      return (b.d?.positive ?? 0) - (a.d?.positive ?? 0);
    });

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Дни челленджа')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
            {team && challenge.teamName ? challenge.teamName : challenge.title || tr('Челлендж')}
            {' · '}{tr('день')} {challenge.currentDay} {tr('из')} {total}
          </Text>
        </View>

        {teamHasDays ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <Segmented
              items={[tr('Я'), tr('Команда')]}
              value={scope}
              onChange={(i) => { setScope(i as 0 | 1); setOpenDay(null); }}
            />
          </View>
        ) : null}

        {shownDays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={tr('История пока пуста')}
            subtitle={tr('Результаты появятся здесь, как только закроется первый день.')}
          />
        ) : (
          <>
            {/* Календарь: одна плитка — один день. Нажатие открывает разбор. */}
            <View style={{ marginHorizontal: 16, padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Array.from({ length: total }).map((_, i) => {
                  const n = i + 1;
                  const t = teamByDay.get(n);
                  const mine = myByDay.get(n);
                  const c = team ? teamTile(t) : tile(stateOf(mine));
                  const isToday = team ? t && !t.past : mine && !mine.past;
                  const clickable = team ? !!t : !!mine;
                  const flags = team ? (t?.past ? t.flags : 0) : (mine?.past ? totalFlags(mine.flags) : 0);
                  return (
                    <Pressable
                      key={n}
                      disabled={!clickable}
                      onPress={() => clickable && setOpenDay(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${tr('День')} ${n}`}
                      style={({ pressed }) => ({
                        width: 44, height: 44, borderRadius: 12,
                        borderCurve: 'continuous',
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: c.bg,
                        borderWidth: isToday ? 1.5 : 0,
                        borderColor: T.brand,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text style={[ty.subheadEm, { color: c.fg }]}>{n}</Text>
                      {flags > 0 ? (
                        <Text style={{ fontSize: 9, marginTop: -2 }} numberOfLines={1}>
                          {team ? `🚩${flags}` : '🚩'}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Легенда: без неё цвета приходится угадывать. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {([
                  ['clean', team ? tr('все закрыли') : tr('норма закрыта')],
                  ['flagged', team ? tr('есть флаги') : tr('есть флаг')],
                  ['missed', team ? tr('провалили половина+') : tr('не отмечался')],
                  ['today', tr('сегодня')],
                ] as [DayState, string][]).map(([st, label]) => (
                  <View key={st} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, borderCurve: 'continuous', backgroundColor: tile(st).bg }} />
                    <Text style={[ty.caption2, { color: T.labelSecondary }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Сводка за прошедшие дни */}
            <View style={{ flexDirection: 'row', marginTop: 16, marginHorizontal: 16 }}>
              {[
                { v: String(summary.clean), l: team ? tr('чистых дней') : tr('чисто') },
                { v: String(summary.problem), l: tr('с флагом') },
                { v: `+${Math.round(summary.points)}`, l: tr('баллов') },
                { v: summary.penalty ? String(Math.round(summary.penalty)) : '0', l: tr('штрафов') },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
                  <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{s.l}</Text>
                </View>
              ))}
            </View>

            {/* Список: то же самое, но подробнее и с прокруткой */}
            <ListSection
              header={tr('По дням')}
              footer={team
                ? tr('Нажмите на день, чтобы увидеть результат каждого участника команды.')
                : `${tr('🚩 — флаг за пропуск дневной нормы.')} ${maxFlags} ${tr('в одной категории → вылет.')}`}
            >
              {team
                ? [...teamDays].reverse().map((d, i, arr) => (
                    <TeamDayRowView key={d.day} d={d} last={i === arr.length - 1} onPress={() => setOpenDay(d.day)} />
                  ))
                : [...myDays].reverse().map((d, i, arr) => (
                    <DayRow key={d.day} d={d} last={i === arr.length - 1} onPress={() => setOpenDay(d.day)} />
                  ))}
            </ListSection>
          </>
        )}

        <View style={{ height: 30 }} />
      </Screen>

      {openDay != null && team ? (
        <TeamDayDetail
          t={teamByDay.get(openDay)}
          rows={rowsForDay(openDay)}
          onClose={() => setOpenDay(null)}
        />
      ) : (
        <DayDetail day={openDay != null ? myByDay.get(openDay) ?? null : null} onClose={() => setOpenDay(null)} />
      )}
    </View>
  );
}

function DayRow({ d, last, onPress }: { d: ChallengeDay; last: boolean; onPress: () => void }) {
  const { T, ty } = useTheme();
  const flags = totalFlags(d.flags);
  const missed = d.past && !d.reported && !d.left;

  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${tr('День')} ${d.day}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={[ty.headline, { color: d.past ? T.label : T.brand }]}>{d.day}</Text>
          <Text style={[ty.caption2, { color: T.labelTertiary }]}>{tr('день')}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
            {dayDate(d.dateISO)}{!d.past ? ` · ${tr('идёт')}` : ''}
          </Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
            {d.left
              ? tr('🏳️ вышли по белому флагу')
              : missed
                ? tr('не отмечался')
                : `${d.pages} ${tr('стр.')} · ${d.sugarFree ? tr('без сахара') : tr('сахар был')} · ${fmtInt(d.steps)} ${tr('шагов')}`}
          </Text>
        </View>

        {flags > 0 ? <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {flags}</Capsule> : null}

        <View style={{ alignItems: 'flex-end', minWidth: 54 }}>
          <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>+{Math.round(d.positive)}</Text>
          {d.penalty ? (
            <Text style={[ty.caption2, { color: T.red }]} numberOfLines={1}>{Math.round(d.penalty)}</Text>
          ) : null}
        </View>
      </Pressable>
      {!last ? <View style={{ position: 'absolute', bottom: 0, left: 68, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
    </View>
  );
}

/** Строка командного дня: сколько человек закрыли норму и во что это вылилось. */
function TeamDayRowView({ d, last, onPress }: { d: TeamDay; last: boolean; onPress: () => void }) {
  const { T, ty } = useTheme();

  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${tr('День')} ${d.day}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={[ty.headline, { color: d.past ? T.label : T.brand }]}>{d.day}</Text>
          <Text style={[ty.caption2, { color: T.labelTertiary }]}>{tr('день')}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
            {dayDate(d.dateISO)}{!d.past ? ` · ${tr('идёт')}` : ''}
          </Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
            {d.past
              ? `${d.clean} ${tr('из')} ${d.size} ${tr('закрыли день')}`
              : `${d.reported} ${tr('из')} ${d.size} ${tr('уже отметились')}`}
          </Text>
        </View>

        {d.flags > 0 ? <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {d.flags}</Capsule> : null}

        <View style={{ alignItems: 'flex-end', minWidth: 54 }}>
          <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>+{Math.round(d.positive)}</Text>
          {d.penalty ? (
            <Text style={[ty.caption2, { color: T.red }]} numberOfLines={1}>{Math.round(d.penalty)}</Text>
          ) : null}
        </View>
      </Pressable>
      {!last ? <View style={{ position: 'absolute', bottom: 0, left: 68, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
    </View>
  );
}

/** Общая обёртка нижней шторки — у своего и командного разбора она одинаковая. */
function Sheet({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode;
}) {
  const { T, ty } = useTheme();
  const { height } = useWindowDimensions();
  // Высота в ПИКСЕЛЯХ, а не в процентах. Процент считается от родителя, и когда
  // Yoga не может его разрешить, список получает высоту своего содержимого:
  // он «крутится» внутри, но целиком не помещается на экран, и хвост
  // недостижим — со стороны это выглядит как зависшая прокрутка.
  const sheetMax = Math.round(height * 0.86);
  const listMax = sheetMax - 130; // шапка шторки: ручка, заголовок, подпись

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Затемнение — отдельным слоем ПОД шторкой, а не её родителем.
            Pressable, обёрнутый вокруг прокручиваемого списка, забирает себе
            жест: список переставал крутиться, и хвост из двадцати участников
            было не достать. */}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr('Закрыть')}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

        <View style={{ backgroundColor: T.groupedBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderCurve: 'continuous', paddingBottom: 34, maxHeight: sheetMax }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, borderCurve: 'continuous', backgroundColor: T.fillTertiary }} />
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
            <Text style={[ty.title2, { color: T.label }]}>{title}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2 }]}>{subtitle}</Text>
          </View>

          <ScrollView style={{ maxHeight: listMax }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Разбор дня: что было по каждой категории и во что это вылилось. */
function DayDetail({ day: d, onClose }: { day: ChallengeDay | null; onClose: () => void }) {
  const { T, ty } = useTheme();
  if (!d) return null;

  const rows = [
    { key: 'R', title: tr('Чтение'), icon: 'book.fill', got: `${d.pages} ${tr('стр.')}`, norm: `20 ${tr('стр.')}`, ok: d.pages >= 20, flags: d.flags.R },
    { key: 'NS', title: tr('Без сахара'), icon: 'cube.fill', got: d.sugarFree ? tr('да') : tr('нет'), norm: tr('весь день'), ok: d.sugarFree, flags: d.flags.NS },
    { key: 'A', title: tr('Активность'), icon: 'figure.walk', got: fmtInt(d.steps), norm: fmtInt(10000), ok: d.steps >= 10000, flags: d.flags.A },
  ];

  return (
    <Sheet
      title={`${tr('День')} ${d.day}`}
      subtitle={`${dayDate(d.dateISO)}${!d.past ? ` · ${tr('ещё идёт')}` : ''}`}
      onClose={onClose}
    >
      {d.left ? (
        // День выхода закрыт, но не судится. Без этой ветки он попадал бы под
        // условие ниже и обещал −300 за пропуск, которого не было.
        <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.fillTertiary }}>
          <Text style={[ty.caption1, { color: T.label }]}>
            {tr('В этот день вы вышли из челленджа по белому флагу 🏳️. Заработанное осталось, штрафы за него и за следующие дни не начисляются.')}
          </Text>
        </View>
      ) : !d.past ? (
        <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: T.brandTinted }}>
          <Text style={[ty.caption1, { color: T.label }]}>
            {tr('День не закончился — штрафы за него ещё не начисляются. Успеете добрать норму до 23:00.')}
          </Text>
        </View>
      ) : !d.reported ? (
        <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(255,59,48,0.12)' }}>
          <Text style={[ty.caption1, { color: T.label }]}>
            {tr('В этот день отметок не было или они пришли после 23:00: −300 баллов и по флагу в каждой категории.')}
          </Text>
        </View>
      ) : null}

      <ListSection header={tr('По категориям')}>
        {rows.map((r, i) => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: i < rows.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
            <SF name={r.icon} size={18} color={r.ok ? T.green : T.labelSecondary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{r.title}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                {tr('норма')} {r.norm}
              </Text>
            </View>
            {/* flexShrink: 0 — значение обрезаться не должно НИКОГДА: ради него
                строку и открывают. Ужимается название слева, у него есть
                многоточие и подпись с нормой рядом. */}
            <Text style={[ty.subheadEm, { color: r.ok ? T.greenText : T.label, flexShrink: 0 }]} numberOfLines={1}>{r.got}</Text>
            {r.flags > 0 ? <Text style={{ fontSize: 14 }}>🚩</Text> : r.ok ? <SF name="checkmark" size={15} color={T.green} /> : null}
          </View>
        ))}
      </ListSection>

      <ListSection header={tr('Итог дня')}>
        <View style={{ padding: 14, gap: 8 }}>
          <Line T={T} k={tr('Заработано')} v={`+${Math.round(d.positive)}`} />
          {d.penalty ? <Line T={T} k={tr('Штрафы')} v={String(Math.round(d.penalty))} danger /> : null}
          <View style={{ height: 0.5, backgroundColor: T.separator }} />
          <Line T={T} k={tr('Всего за день')} v={String(Math.round(d.positive + d.penalty))} bold />
        </View>
      </ListSection>
    </Sheet>
  );
}

/** Командный разбор дня: строка на каждого участника, проблемы сверху. */
function TeamDayDetail({ t, rows, onClose }: {
  t: TeamDay | undefined; rows: TeamDayRow[]; onClose: () => void;
}) {
  const { T, ty } = useTheme();
  if (!t) return null;

  return (
    <Sheet
      title={`${tr('День')} ${t.day}`}
      subtitle={`${dayDate(t.dateISO)}${!t.past ? ` · ${tr('ещё идёт')}` : ''} · ${t.clean} ${tr('из')} ${t.size}`}
      onClose={onClose}
    >
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 4 }}>
        {[
          { v: String(t.clean), l: tr('закрыли') },
          { v: String(t.size - t.clean), l: t.past ? tr('не закрыли') : tr('ещё нет') },
          { v: `+${Math.round(t.positive)}`, l: tr('баллов') },
          { v: t.penalty ? String(Math.round(t.penalty)) : '0', l: tr('штрафов') },
        ].map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{s.v}</Text>
            <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>{s.l}</Text>
          </View>
        ))}
      </View>

      <ListSection header={tr('Участники')}>
        {rows.map((r, i) => (
          <MemberDayRow key={r.id} r={r} past={t.past} last={i === rows.length - 1} />
        ))}
      </ListSection>
    </Sheet>
  );
}

/**
 * Одна цифра дня: значок, число и знак «в норме / не добрал».
 *
 * Раньше все три показателя шли одной строкой рядом с именем — в узкой колонке
 * она не помещалась и обрезалась на «17…», то есть ровно на шагах, ради которых
 * список и открывают. Теперь показатели живут своей строкой во всю ширину.
 */
function DayStat({ icon, value, ok, T, ty }: { icon: string; value: string; ok: boolean; T: any; ty: any }) {
  return (
    // flexBasis: 'auto' — плитка по своему содержимому, а лишнее место делится
    // поровну. С `flex: 1` все три получали одинаковую ширину, и «11 240» в
    // самой узкой не помещалось.
    //
    // adjustsFontSizeToFit здесь был вреден: вместо переноса он ужимал шрифт,
    // и число становилось нечитаемым — ровно то, на что жаловались («видно
    // первые две цифры и дальше точки»).
    <View style={{
      flexGrow: 1, flexShrink: 1, flexBasis: 'auto',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9,
      borderCurve: 'continuous',
      backgroundColor: ok ? 'rgba(52,199,89,0.14)' : 'rgba(255,59,48,0.12)',
    }}>
      <SF name={icon} size={11} color={ok ? T.greenText : T.redText} />
      <Text style={[ty.caption1, nums, { color: ok ? T.greenText : T.redText, flexShrink: 1 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MemberDayRow({ r, past, last }: { r: TeamDayRow; past: boolean; last: boolean }) {
  const { T, ty } = useTheme();
  const d = r.d;
  const flags = totalFlags(d?.flags);
  // Вышедший по белому флагу 🏳️ ничего не пропускал: с него нормы в этот день
  // уже не спрашивают. Показывать ему «не отмечался» красным — обвинять
  // человека в том, чего он не обязан был делать.
  const left = r.left === true;
  const missed = !left && past && d != null && !d.reported;
  const showStats = !!d && !missed && !(left && !d.left);

  return (
    <View style={{ position: 'relative' }}>
      <View style={{ paddingVertical: 10, paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MemberAvatar name={r.name} avatar={r.avatar} size={34} eliminated={r.eliminated} left={left} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[ty.subheadEm, { color: r.isMe ? T.brand : T.label }]} numberOfLines={1}>
              {r.name}{r.isMe ? ` · ${tr('вы')}` : ''}
            </Text>
            {left || !showStats ? (
              <Text style={[ty.caption1, { color: missed ? T.redText : T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                {/* У выбывшего зачёт заморожен — дней после вылета у него просто
                    нет, и «нет данных» тут ввело бы в заблуждение. */}
                {left
                  ? (d?.left ? tr('🏳️ вышел в этот день') : tr('🏳️ вышел по белому флагу'))
                  : !d ? (r.eliminated ? tr('выбыл — зачёт заморожен') : tr('нет данных'))
                  : tr('не отмечался')}
              </Text>
            ) : null}
          </View>

          {flags > 0 && !left ? <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {flags}</Capsule> : null}

          <View style={{ alignItems: 'flex-end', minWidth: 52 }}>
            <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={1}>+{Math.round(d?.positive ?? 0)}</Text>
            {d?.penalty ? (
              <Text style={[ty.caption2, { color: T.red }]} numberOfLines={1}>{Math.round(d.penalty)}</Text>
            ) : null}
          </View>
        </View>

        {showStats ? (
          <View style={{ flexDirection: 'row', gap: 6, marginLeft: 44 }}>
            <DayStat icon="book.fill" value={`${d!.pages} ${tr('стр.')}`} ok={d!.pages >= 20} T={T} ty={ty} />
            <DayStat icon="cube.fill" value={d!.sugarFree ? tr('без сахара') : tr('сахар')} ok={d!.sugarFree} T={T} ty={ty} />
            <DayStat icon="figure.walk" value={fmtInt(d!.steps)} ok={d!.steps >= 10000} T={T} ty={ty} />
          </View>
        ) : null}
      </View>
      {!last ? <View style={{ position: 'absolute', bottom: 0, left: 60, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
    </View>
  );
}

function Line({ T, k, v, danger, bold }: { T: any; k: string; v: string; danger?: boolean; bold?: boolean }) {
  const { ty } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[bold ? ty.headline : ty.subhead, { color: T.labelSecondary }]}>{k}</Text>
      <Text style={[bold ? ty.headline : ty.subhead, { color: danger ? T.redText : T.label }]}>{v}</Text>
    </View>
  );
}
