// Таблица рейтинга в стиле Apple Sports: серые подписи колонок, место · фото ·
// имя (и команда под ним) · ± · 🚩 · очки. Числа моноширинные и выровнены
// вправо, поэтому флаги и очки всегда стоят на одной линии.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { MemberAvatar } from './MemberAvatar';
import { AwardBadge } from './AwardBadge';
import { tr } from '../state/LanguageContext';
import * as pl from '../data/plural';

export interface StandingRow {
  id: string;
  rank: number;
  name: string;
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
  award?: boolean;
}

export interface StandingsTableProps {
  /** Подпись первой колонки: «Команда» или «Участник». */
  nameColumn: string;
  rows: StandingRow[];
  /** Линия под этим местом — призовая зона. 0 — без линии. */
  zoneAfter?: number;
}

/** Сдвиг места со вчера из ответа сервера: rankChange, а у старого — из previousRank. */
export function rankChangeOf(t: { rank: number; previousRank?: number | null; rankChange?: number | null }): number | null {
  if (typeof t.rankChange === 'number') return t.rankChange;
  if (typeof t.previousRank === 'number' && t.previousRank > 0) return t.previousRank - t.rank;
  return null;
}

export function movementLabel(change: number | null, plural: 'team' | 'member' = 'team'): string {
  if (change == null || change === 0) return tr('место не изменилось');
  const n = Math.abs(change);
  const verb = plural === 'team'
    ? (change > 0 ? tr('поднялась на') : tr('опустилась на'))
    : (change > 0 ? tr('поднялся на') : tr('опустился на'));
  return `${verb} ${pl.spots(n)}`;
}

export function StandingsTable({ nameColumn, rows, zoneAfter = 3 }: StandingsTableProps) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const head = [ty.caption1, { color: T.labelSecondary }];
  const num = { fontVariant: ['tabular-nums' as const] };
  const withAvatars = rows.some((r) => r.avatar);
  // Колонки растут вместе с крупным шрифтом, чтобы числа не слипались.
  const COL_RANK = Math.round(28 * textScale);
  const COL_MOVE = Math.round(40 * textScale);
  const COL_FLAG = Math.round(34 * textScale);
  const COL_PTS = Math.round(60 * textScale);
  const AVATAR = Math.round(36 * Math.min(textScale, 1.25));
  const mineBg = isDark ? 'rgba(124,149,255,0.14)' : 'rgba(35,64,136,0.07)';

  return (
    <View testID="standings-table">
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.headRow}>
        <View style={{ width: COL_RANK + (withAvatars ? AVATAR + 10 : 0) }} />
        <Text style={[head, { flex: 1 }]} numberOfLines={1}>{nameColumn}</Text>
        <Text style={[head, { width: COL_MOVE, textAlign: 'right' }]}>±</Text>
        <View style={{ width: COL_FLAG, alignItems: 'flex-end' }}><SF name="flag.fill" size={11} color={T.labelSecondary} /></View>
        <Text style={[head, { width: COL_PTS, textAlign: 'right' }]} numberOfLines={1}>{tr('Очки')}</Text>
      </View>

      {rows.map((r, i) => {
        const up = (r.change ?? 0) > 0;
        const moved = r.change != null && r.change !== 0;
        const label = [
          `${r.rank} ${tr('место')}`, r.name, r.isMine ? tr(withAvatars ? 'это вы' : 'ваша команда') : '', r.subtitle ?? '',
          r.change == null ? '' : movementLabel(r.change, withAvatars ? 'member' : 'team'),
          r.flags ? `${tr('флагов')}: ${r.flags}` : '',
          `${r.points} ${tr('очков')}`,
        ].filter(Boolean).join(', ');
        return (
          <View key={r.id}>
            {zoneAfter > 0 && i === zoneAfter ? <View testID="standings-zone" style={[styles.zone, { backgroundColor: T.separator }]} /> : null}
            <View testID={`standing-${r.id}`} accessible accessibilityLabel={label}
              style={[styles.row, { minHeight: r.subtitle ? 60 : 48 }, r.isMine && { backgroundColor: mineBg }]}>
              <Text style={[ty.body, num, { width: COL_RANK, color: T.label }]}>{r.rank}</Text>
              {r.avatar ? <View style={{ marginRight: 10, opacity: r.dimmed ? 0.55 : 1 }}>
                <MemberAvatar name={r.name} avatar={r.avatar.uri} size={AVATAR} eliminated={r.avatar.eliminated} left={r.avatar.left} />
              </View> : null}
              <View style={{ flex: 1, minWidth: 0, opacity: r.dimmed ? 0.55 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 5 }}>
                  <Text style={[r.isMine ? ty.headline : ty.body, { flexShrink: 1, color: T.label }]} numberOfLines={1}>{r.name}</Text>
                  {r.award ? <AwardBadge size={15} /> : null}
                </View>
                {r.subtitle ? <Text style={[ty.subhead, { color: T.labelSecondary }]} numberOfLines={1}>{r.subtitle}</Text> : null}
              </View>
              <View testID={`standing-move-${r.id}`} style={{ width: COL_MOVE, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', columnGap: 1 }}>
                {moved ? <>
                  <SF name={up ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={9} color={up ? T.greenText : T.redText} />
                  <Text style={[ty.footnoteEm, num, { color: up ? T.greenText : T.redText }]}>{Math.abs(r.change!)}</Text>
                </> : <Text style={[ty.footnote, num, { color: T.labelTertiary }]}>–</Text>}
              </View>
              <Text testID={`standing-flags-${r.id}`} style={[ty.body, num, { width: COL_FLAG, textAlign: 'right', color: r.flags ? T.redText : T.labelTertiary }]}>{r.flags || '–'}</Text>
              <Text style={[ty.headline, num, { width: COL_PTS, textAlign: 'right', color: T.label }]} numberOfLines={1}>{r.points}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  zone: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
