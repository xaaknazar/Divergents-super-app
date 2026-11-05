// Таблица рейтинга в стиле Apple Sports: серые подписи колонок, место · фото ·
// имя (и команда под ним) · ± · 🚩 · очки. Числа моноширинные и выровнены
// вправо, поэтому флаги и очки всегда стоят на одной линии.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { MemberAvatar } from './MemberAvatar';
import { tr } from '../state/LanguageContext';
import * as pl from '../data/plural';

export interface StandingRow {
  id: string;
  rank: number;
  name: string;
  /** Полное имя для VoiceOver, если на экране оно сокращено («Мадина А.»). */
  fullName?: string;
  /** Вторая строка — у участника это команда. */
  subtitle?: string;
  /** Фото участника. У команд фото нет — передайте undefined. */
  avatar?: { uri?: string | null; eliminated?: boolean; left?: boolean };
  /** Насколько мест сдвинулся со вчера: >0 вверх, <0 вниз, null — сравнивать не с чем. */
  change: number | null;
  flags: number;
  points: number;
  isMine: boolean;
  /** Выбыл или вышел — строка приглушена, место сохраняется. */
  dimmed?: boolean;
  /** Что показать в главной колонке вместо points (например «36,5»). */
  value?: string;
  /** Вторая числовая колонка (серым), если у таблицы задан secondaryColumn. */
  secondary?: string;
  /** Своя подпись для VoiceOver вместо собранной автоматически. */
  a11yLabel?: string;
  /** Нажатие на строку (например, открыть историю участника). */
  onPress?: () => void;
  a11yHint?: string;
}

export interface StandingsTableProps {
  /** Подпись первой колонки: «Команда» или «Участник». */
  nameColumn: string;
  rows: StandingRow[];
  /** Линия под этим местом — призовая зона. 0 — без линии. */
  zoneAfter?: number;
  /** Подпись главной колонки. По умолчанию «Очки». */
  valueColumn?: string;
  /** Подпись второй числовой колонки (серым). Без неё колонки нет. */
  secondaryColumn?: string;
  /** Колонка ± (движение со вчера). У рейтинга чтения её нет. */
  showMove?: boolean;
}

/** Сдвиг места со вчера из ответа сервера: rankChange, а у старого — из previousRank. */
export function rankChangeOf(t: { rank: number; previousRank?: number | null; rankChange?: number | null }): number | null {
  if (typeof t.rankChange === 'number') return t.rankChange;
  if (typeof t.previousRank === 'number' && t.previousRank > 0) return t.previousRank - t.rank;
  return null;
}

/**
 * Имя как в Apple Sports («L. Norris»), только по-нашему: «Мадина Ахметова» →
 * «Мадина А.». Так в узкой строке видно имя целиком, а не «Мадина Ахм…».
 * Псевдоним из одного слова не трогаем.
 */
export function shortPersonName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(' ')} ${last[0].toUpperCase()}.`;
}

export function movementLabel(change: number | null, plural: 'team' | 'member' = 'team'): string {
  if (change == null || change === 0) return tr('место не изменилось');
  const n = Math.abs(change);
  const verb = plural === 'team'
    ? (change > 0 ? tr('поднялась на') : tr('опустилась на'))
    : (change > 0 ? tr('поднялся на') : tr('опустился на'));
  return `${verb} ${pl.spots(n)}`;
}

export function StandingsTable({ nameColumn, rows, zoneAfter = 3, valueColumn, secondaryColumn, showMove = true }: StandingsTableProps) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const head = [ty.caption1, { color: T.labelSecondary }];
  const num = { fontVariant: ['tabular-nums' as const] };
  const withAvatars = rows.some((r) => r.avatar);
  // Колонки растут вместе с крупным шрифтом, чтобы числа не слипались.
  const COL_RANK = Math.round(28 * textScale);
  const COL_MOVE = Math.round(38 * textScale);
  const COL_FLAG = Math.round(30 * textScale);
  const COL_PTS = Math.round(56 * textScale);
  const COL_SEC = Math.round(52 * textScale);
  const AVATAR = Math.round(36 * Math.min(textScale, 1.25));
  const mineBg = isDark ? 'rgba(124,149,255,0.14)' : 'rgba(35,64,136,0.07)';

  return (
    <View testID="standings-table">
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.headRow}>
        <View style={{ width: COL_RANK + (withAvatars ? AVATAR + 10 : 0) }} />
        <Text style={[head, { flex: 1 }]} numberOfLines={1}>{nameColumn}</Text>
        {showMove ? <Text style={[head, { width: COL_MOVE, textAlign: 'right' }]}>±</Text> : null}
        <View style={{ width: COL_FLAG, alignItems: 'flex-end' }}><SF name="flag.fill" size={11} color={T.labelSecondary} /></View>
        {secondaryColumn ? <Text style={[head, { minWidth: COL_SEC, paddingLeft: 6, textAlign: 'right' }]} numberOfLines={1}>{secondaryColumn}</Text> : null}
        <Text style={[head, { minWidth: COL_PTS, paddingLeft: 6, textAlign: 'right' }]} numberOfLines={1}>{valueColumn ?? tr('Очки')}</Text>
      </View>

      {rows.map((r, i) => {
        const up = (r.change ?? 0) > 0;
        const moved = r.change != null && r.change !== 0;
        const label = r.a11yLabel ?? [
          `${r.rank} ${tr('место')}`, r.fullName ?? r.name, r.isMine ? tr(withAvatars ? 'это вы' : 'ваша команда') : '', r.subtitle ?? '',
          r.change == null ? '' : movementLabel(r.change, withAvatars ? 'member' : 'team'),
          r.flags ? `${tr('флагов')}: ${r.flags}` : '',
          `${r.points} ${tr('очков')}`,
        ].filter(Boolean).join(', ');
        return (
          <View key={r.id}>
            {zoneAfter > 0 && i === zoneAfter ? <View testID="standings-zone" style={[styles.zone, { backgroundColor: T.separator }]} /> : null}
            <Row testID={`standing-${r.id}`} label={label} onPress={r.onPress} hint={r.a11yHint}
              style={[styles.row, { minHeight: r.subtitle ? 60 : 48 }, r.isMine && { backgroundColor: mineBg }]}>
              <Text style={[ty.body, num, { width: COL_RANK, color: T.label }]}>{r.rank}</Text>
              {r.avatar ? <View style={{ marginRight: 10, opacity: r.dimmed ? 0.55 : 1 }}>
                <MemberAvatar name={r.name} avatar={r.avatar.uri} size={AVATAR} eliminated={r.avatar.eliminated} left={r.avatar.left} />
              </View> : null}
              <View style={{ flex: 1, minWidth: 0, opacity: r.dimmed ? 0.55 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 5 }}>
                  <Text style={[r.isMine ? ty.headline : ty.body, { flexShrink: 1, color: T.label }]} numberOfLines={1}>{r.name}</Text>
                </View>
                {r.subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{r.subtitle}</Text> : null}
              </View>
              {showMove ? <View testID={`standing-move-${r.id}`} style={{ width: COL_MOVE, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', columnGap: 1 }}>
                {moved ? <>
                  <SF name={up ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={9} color={up ? T.greenText : T.redText} />
                  <Text style={[ty.footnoteEm, num, { color: up ? T.greenText : T.redText }]}>{Math.abs(r.change!)}</Text>
                </> : <Text style={[ty.footnote, num, { color: T.labelTertiary }]}>–</Text>}
              </View> : null}
              <Text testID={`standing-flags-${r.id}`} style={[ty.body, num, { width: COL_FLAG, textAlign: 'right', color: r.flags ? T.redText : T.labelTertiary }]}>{r.flags || '–'}</Text>
              {secondaryColumn ? <Text style={[ty.body, num, { minWidth: COL_SEC, paddingLeft: 6, textAlign: 'right', color: T.labelSecondary }]} numberOfLines={1}>{r.secondary ?? ''}</Text> : null}
              <Text style={[ty.headline, num, { minWidth: COL_PTS, paddingLeft: 6, textAlign: 'right', color: T.label }]} numberOfLines={1}>{r.value ?? r.points}</Text>
            </Row>
          </View>
        );
      })}
    </View>
  );
}

function Row({ testID, label, hint, onPress, style, children }: {
  testID: string; label: string; hint?: string; onPress?: () => void; style: object[] | object; children: React.ReactNode;
}) {
  if (!onPress) return <View testID={testID} accessible accessibilityLabel={label} style={style}>{children}</View>;
  return <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
    style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  zone: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
