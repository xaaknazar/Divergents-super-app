// Таблица команд в стиле Apple Sports: заголовок по центру, серые подписи
// колонок, место · значок · команда · ± · 🚩 · очки. Числа моноширинные и
// выровнены вправо, поэтому флаги и очки всегда стоят на одной линии.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { SF } from './SFIcon';
import { tr } from '../state/LanguageContext';
import * as pl from '../data/plural';
import type { TeamStanding } from '../data/community';

export interface TeamStandingsTableProps {
  teams: TeamStanding[];
  /** Подзаголовок под «Таблица», например «День 9 из 21 · изменения со вчера». */
  caption?: string;
  /** Линия под этим местом — призовая зона. 0 — без линии. */
  zoneAfter?: number;
}

const AVATAR_COLORS = ['#5B7CFA', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6', '#EF6C4D', '#0EA5E9'];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Сдвиг места со вчера: >0 поднялась, <0 опустилась, 0 — то же, null — нет данных. */
export function teamRankChange(t: Pick<TeamStanding, 'rank' | 'previousRank' | 'rankChange'>): number | null {
  if (typeof t.rankChange === 'number') return t.rankChange;
  if (typeof t.previousRank === 'number' && t.previousRank > 0) return t.previousRank - t.rank;
  return null;
}

export function movementLabel(change: number | null): string {
  if (change == null || change === 0) return tr('место не изменилось');
  const n = Math.abs(change);
  return `${change > 0 ? tr('поднялась на') : tr('опустилась на')} ${pl.spots(n)}`;
}

export function TeamStandingsTable({ teams, caption, zoneAfter = 3 }: TeamStandingsTableProps) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const head = [ty.caption1, { color: T.labelSecondary }];
  const num = { fontVariant: ['tabular-nums' as const] };
  // Колонки растут вместе с крупным шрифтом, чтобы числа не слипались.
  const COL_RANK = Math.round(26 * textScale);
  const COL_MOVE = Math.round(40 * textScale);
  const COL_FLAG = Math.round(36 * textScale);
  const COL_PTS = Math.round(62 * textScale);
  const AVATAR = Math.round(26 * Math.min(textScale, 1.3));
  const mineBg = isDark ? 'rgba(124,149,255,0.14)' : 'rgba(35,64,136,0.07)';

  return (
    <View testID="team-standings-table" style={[styles.card, { backgroundColor: T.cardBg }]}>
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center' }]}>{tr('Таблица')}</Text>
      {caption ? <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginTop: 2, paddingHorizontal: 16 }]}>{caption}</Text> : null}

      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.headRow}>
        <View style={{ width: COL_RANK + AVATAR + 10 }} />
        <Text style={[head, { flex: 1 }]} numberOfLines={1}>{tr('Команда')}</Text>
        <Text style={[head, { width: COL_MOVE, textAlign: 'right' }]}>±</Text>
        <View style={{ width: COL_FLAG, alignItems: 'flex-end' }}><SF name="flag.fill" size={11} color={T.labelSecondary} /></View>
        <Text style={[head, { width: COL_PTS, textAlign: 'right' }]} numberOfLines={1}>{tr('Очки')}</Text>
      </View>

      {teams.map((t, i) => {
        const change = teamRankChange(t);
        const up = (change ?? 0) > 0;
        const moved = change != null && change !== 0;
        const flags = t.flags ?? 0;
        const label = [
          `${t.rank} ${tr('место')}`, t.name, t.isMine ? tr('ваша команда') : '',
          change == null ? '' : movementLabel(change),
          flags ? `${tr('флагов')}: ${flags}` : '',
          `${t.points} ${tr('очков')}`,
        ].filter(Boolean).join(', ');
        return (
          <View key={t.id}>
            {zoneAfter > 0 && i === zoneAfter ? <View testID="team-standings-zone" style={[styles.zone, { backgroundColor: T.separator }]} /> : null}
            <View testID={`team-row-${t.id}`} accessible accessibilityLabel={label}
              style={[styles.row, t.isMine && { backgroundColor: mineBg }]}>
              <Text style={[ty.body, num, { width: COL_RANK, color: T.label }]}>{t.rank}</Text>
              <View style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, marginRight: 10,
                backgroundColor: colorFor(t.id), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[ty.footnoteEm, { color: '#FFFFFF' }]}>{(t.name.trim()[0] ?? '·').toUpperCase()}</Text>
              </View>
              <Text style={[t.isMine ? ty.headline : ty.body, { flex: 1, minWidth: 0, color: T.label }]} numberOfLines={1}>{t.name}</Text>
              <View testID={`team-move-${t.id}`} style={{ width: COL_MOVE, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', columnGap: 1 }}>
                {moved ? <>
                  <SF name={up ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={9} color={up ? T.greenText : T.redText} />
                  <Text style={[ty.footnoteEm, num, { color: up ? T.greenText : T.redText }]}>{Math.abs(change!)}</Text>
                </> : <Text style={[ty.footnote, num, { color: T.labelTertiary }]}>–</Text>}
              </View>
              <Text testID={`team-flags-${t.id}`} style={[ty.body, num, { width: COL_FLAG, textAlign: 'right', color: flags ? T.redText : T.labelTertiary }]}>{flags || '–'}</Text>
              <Text style={[ty.headline, num, { width: COL_PTS, textAlign: 'right', color: T.label }]} numberOfLines={1}>{t.points}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block, borderCurve: 'continuous', paddingTop: 14, paddingBottom: 6, overflow: 'hidden' },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
  zone: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
