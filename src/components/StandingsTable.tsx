// Таблица рейтинга в стиле Apple Sports: серые подписи колонок, место · фото ·
// имя (и команда под ним) · ± · 🚩 · очки. Числа моноширинные и выровнены
// вправо, поэтому флаги и очки всегда стоят на одной линии.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SF } from './SFIcon';
import { MemberAvatar } from './MemberAvatar';
import { RankMedal } from './RankMedal';
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
  /** Вторая строка элементом вместо текста — например, цели дня значками. */
  detail?: React.ReactNode;
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
  /** Второй показатель (серым под основным), если задан secondaryColumn. */
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
  /** Подпись второго показателя под основным. */
  secondaryColumn?: string;
  /** Колонка ±: движение относительно вчерашнего результата. */
  showMove?: boolean;
  /** Скрываем колонку, когда API просмотра не отдаёт флаги. */
  showFlags?: boolean;
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
  if (change == null) return tr('нет данных для сравнения');
  if (change === 0) return tr('место не изменилось');
  const n = Math.abs(change);
  const verb = plural === 'team'
    ? (change > 0 ? tr('поднялась на') : tr('опустилась на'))
    : (change > 0 ? tr('поднялся на') : tr('опустился на'));
  return `${verb} ${pl.spots(n)}`;
}

export function StandingsTable({ nameColumn, rows, zoneAfter = 3, valueColumn, secondaryColumn, showMove = true, showFlags = true }: StandingsTableProps) {
  const { T, ty, isDark, textScale = 1 } = useTheme();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const [tableWidth, setTableWidth] = useState<number | null>(null);
  const head = [ty.caption1, { color: T.labelSecondary }];
  const num = { fontVariant: ['tabular-nums' as const] };
  const withAvatars = rows.some((r) => r.avatar);
  // Header and values share one grid. Reserve space for the largest value
  // in each column, including OS Dynamic Type and app text personalization.
  const scale = textScale * fontScale;
  const numberWidth = (values: string[], fontSize: number) =>
    Math.ceil(Math.max(1, ...values.map(value => value.length)) * fontSize * fontScale * 0.68 + 2);
  const COL_RANK = Math.max(Math.round(40 * scale), numberWidth(rows.map(row => String(row.rank)), ty.body.fontSize ?? 17) + 8);
  const COL_MOVE = Math.max(Math.round(34 * scale), numberWidth(rows.map(row => String(Math.abs(row.change ?? 0))), ty.footnoteEm.fontSize ?? 13) + 12);
  const COL_FLAG = Math.max(Math.round(20 * scale), numberWidth(rows.map(row => String(row.flags)), ty.body.fontSize ?? 17));
  const COL_PTS = Math.max(Math.round((secondaryColumn ? 82 : 56) * scale),
    numberWidth([valueColumn ?? tr('Очки')], ty.caption1.fontSize ?? 12),
    numberWidth(rows.map(row => row.value ?? String(row.points)), ty.headline.fontSize ?? 17));
  const numericGap = 12;
  const AVATAR = Math.round(36 * Math.min(textScale, 1.25));
  const valueCell = { width: COL_PTS };
  const numericWidth = (showMove ? COL_MOVE + numericGap : 0) + (showFlags ? COL_FLAG + numericGap : 0) + COL_PTS;
  const contentWidth = (tableWidth ?? screenWidth - 32) - 32;
  const avatarWidth = withAvatars ? AVATAR + 10 : 0;
  // Every ranking can stack, not only Reading. Keep identity readable rather
  // than squeezing it between the photo and three fixed numeric columns.
  const stacked = contentWidth - COL_RANK - numericWidth - avatarWidth - numericGap < 100 * scale;
  // At accessibility sizes even the metrics may need more than one line.
  const wrapMetrics = numericWidth > contentWidth;
  const mineBg = isDark ? 'rgba(124,149,255,0.14)' : 'rgba(35,64,136,0.07)';

  return (
    <View testID="standings-table" onLayout={event => setTableWidth(event.nativeEvent.layout.width)}>
      {!stacked ? <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.headRow}>
        <View style={{ width: COL_RANK + (withAvatars ? AVATAR + 10 : 0) }} />
        <Text style={[head, { flex: 1, marginRight: numericGap }]} numberOfLines={1}>{nameColumn}</Text>
        <View style={styles.metrics}>
          {showMove ? <Text style={[head, { width: COL_MOVE, textAlign: 'right' }]}>±</Text> : null}
          {showFlags ? <View style={{ width: COL_FLAG, alignItems: 'flex-end' }}><SF name="flag.fill" size={11} color={T.labelSecondary} /></View> : null}

          <Text style={[head, valueCell, styles.numericText]} numberOfLines={1}>{valueColumn ?? tr('Очки')}</Text>
        </View>
      </View> : null}

      {rows.map((r, i) => {
        const up = (r.change ?? 0) > 0;
        const moved = r.change != null && r.change !== 0;
        const label = r.a11yLabel ?? [
          `${r.rank} ${tr('место')}`, r.fullName ?? r.name, r.isMine ? tr(withAvatars ? 'это вы' : 'ваша команда') : '', r.subtitle ?? '',
          !showMove ? '' : movementLabel(r.change, withAvatars ? 'member' : 'team'),
          r.flags ? `${tr('флагов')}: ${r.flags}` : '',
          `${r.points} ${tr('очков')}`,
        ].filter(Boolean).join(', ');
        return (
          <View key={r.id}>
            {zoneAfter > 0 && i === zoneAfter ? <View testID="standings-zone" style={[styles.zone, { backgroundColor: T.separator }]} /> : null}
            <Row testID={`standing-${r.id}`} label={label} onPress={r.onPress} hint={r.a11yHint}
              style={[styles.row, { minHeight: r.subtitle || r.detail ? 60 : 48 }, stacked && styles.stackedRow, r.isMine && { backgroundColor: mineBg }]}>
              <View style={{ width: COL_RANK, alignItems: 'center', paddingRight: 8 }}><RankMedal rank={r.rank} /></View>
              {withAvatars ? <View style={{ marginRight: 10, opacity: r.dimmed ? 0.55 : 1 }}>
                <MemberAvatar name={r.name} avatar={r.avatar?.uri} size={AVATAR} eliminated={r.avatar?.eliminated} left={r.avatar?.left} />
              </View> : null}
              <View style={{ flex: 1, minWidth: 0, opacity: r.dimmed ? 0.55 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 5 }}>
                  <Text style={[r.isMine ? ty.headline : ty.body, { flexShrink: 1, color: T.label }]} numberOfLines={stacked ? undefined : 2}>{r.name}</Text>
                </View>
                {!showFlags && r.flags > 0 ? <Text style={[ty.caption1, { color: T.redText }]}>Флаги: {r.flags}</Text> : null}
                {r.detail ?? (r.subtitle ? <Text style={[secondaryColumn ? ty.caption1 : ty.subhead, { color: T.labelSecondary }]} numberOfLines={stacked ? undefined : 2}>{r.subtitle}</Text> : null)}
              </View>
              <View style={[styles.metrics, styles.rowMetrics, stacked && styles.stackedMetrics, wrapMetrics && styles.wrappedMetrics]}>
                {showMove && r.change != null ? <View testID={`standing-move-${r.id}`} style={{ width: COL_MOVE, maxWidth: '100%', rowGap: 4 }}>
                  {stacked ? <Text style={[head, styles.numericText]}>±</Text> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', columnGap: 1 }}>
                  {moved ? <>
                    <SF name={up ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={9} color={up ? T.greenText : T.redText} />
                    <Text style={[ty.footnoteEm, num, { color: up ? T.greenText : T.redText }]}>{Math.abs(r.change!)}</Text>
                  </> : <Text style={[ty.footnote, num, { color: T.labelTertiary }]}>{r.change == null ? '' : '–'}</Text>}
                  </View>
                </View> : showMove ? <View style={{ width: COL_MOVE }} /> : null}
                {showFlags ? <View style={{ width: COL_FLAG, alignItems: 'flex-end', rowGap: 4 }}>
                  {stacked ? <View accessible={false} style={styles.flagCaption}><SF name="flag.fill" size={11} color={T.labelSecondary} /></View> : null}
                  <Text testID={`standing-flags-${r.id}`} style={[ty.body, num, styles.numericText, { color: r.flags ? T.redText : T.labelTertiary }]}>{r.flags || '–'}</Text>
                </View> : null}
                <View style={[valueCell, styles.metricCell]}>
                  {stacked ? <Text style={[head, styles.numericText]} numberOfLines={1}>{valueColumn ?? tr('Очки')}</Text> : null}
                  <Text style={[ty.headline, num, styles.numericText, { color: T.label }]} numberOfLines={wrapMetrics ? undefined : 1}>{r.value ?? r.points}</Text>
                  {secondaryColumn ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[ty.caption1, styles.numericText, { color: T.labelSecondary }]}>{r.secondary} {secondaryColumn}</Text> : null}
                </View>
              </View>
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
  stackedRow: { flexWrap: 'wrap', paddingVertical: 12 },
  metrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, columnGap: 12 },
  rowMetrics: { marginLeft: 12 },
  stackedMetrics: { width: '100%', marginLeft: 0, paddingTop: 12, alignItems: 'flex-end' },
  wrappedMetrics: { flexWrap: 'wrap', rowGap: 12 },
  metricCell: { maxWidth: '100%', rowGap: 4 },
  numericText: { textAlign: 'right' },
  flagCaption: { height: 14, justifyContent: 'center' },
  zone: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
