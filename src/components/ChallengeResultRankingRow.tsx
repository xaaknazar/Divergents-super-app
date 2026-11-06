import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { OverallStanding, ResultsTeamRow } from '../data/community';
import { fmtInt } from '../data/format';
import * as pl from '../data/plural';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { MemberAvatar } from './MemberAvatar';
import { SF } from './SFIcon';

type MemberRow = Pick<OverallStanding, 'id' | 'name' | 'rank' | 'points' | 'teamName'>
  & Partial<Pick<OverallStanding, 'avatar' | 'isMe' | 'left' | 'eliminated' | 'award'>>;
type TeamRow = Omit<ResultsTeamRow, 'isMine'> & { isMine?: boolean };
type Props = ({ kind: 'team'; row: TeamRow } | { kind: 'member'; row: MemberRow; teamRank?: number }) & { last?: boolean };

/** Shared final-ranking row. A teamRank changes ranking semantics, not styling. */
export function ChallengeResultRankingRow(props: Props) {
  const { T, ty, textScale = 1 } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const row = props.row;
  const mine = props.kind === 'team' ? props.row.isMine : props.row.isMe;
  const rank = props.kind === 'member' ? props.teamRank ?? row.rank : row.rank;
  const status = props.kind === 'member'
    ? props.row.left ? tr('Вышел по белому флагу') : props.row.eliminated ? tr('Выбыл') : ''
    : '';
  const subtitle = props.kind === 'team' ? pl.people(props.row.members)
    : props.teamRank ? status : [props.row.teamName || tr('Без команды'), status].filter(Boolean).join(' · ');
  // Keep safeSpaces from fmtInt: Gotham Rounded has an oversized NBSP glyph.
  const points = fmtInt(row.points);
  const rankWidth = Math.max(28, Math.ceil(String(rank).length * (ty.footnoteEm.fontSize ?? 13) * fontScale * 0.68 + 4));
  const pointsWidth = Math.ceil(Math.max(points.length * (ty.headline.fontSize ?? 17),
    tr('баллов').length * (ty.caption1.fontSize ?? 12)) * fontScale * 0.68 + 4);
  const contentWidth = (rowWidth ?? width - 32) - 32 - rankWidth - 34 - 24;
  const stacked = contentWidth - pointsWidth - 12 < 120 * textScale * fontScale;
  return <View testID={`result-ranking-${props.kind}-${row.id}`} accessible
    onLayout={event => setRowWidth(event.nativeEvent.layout.width)}
    accessibilityLabel={`${rank} ${tr('место')}. ${row.name}${mine ? `, ${props.kind === 'team' ? tr('ваша команда') : tr('вы')}` : ''}. ${fmtInt(row.points)} ${tr('баллов')}${subtitle ? `. ${subtitle}` : ''}`}
    style={{ padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center',
      backgroundColor: mine ? T.brandTinted : T.cardBg,
      borderBottomWidth: props.last ? 0 : 0.5, borderBottomColor: T.separator }}>
    <Text style={[ty.footnoteEm, nums, { color: T.labelSecondary, width: rankWidth, textAlign: 'center' }]}>{rank || '—'}</Text>
    {props.kind === 'member'
      ? <MemberAvatar name={row.name} avatar={props.row.avatar} size={34} eliminated={props.row.eliminated} left={props.row.left === true} />
      : <View style={{ width: 34, alignItems: 'center' }}><SF name={row.rank === 1 ? 'trophy.fill' : 'person.3.fill'} size={26} color={T.brandText} /></View>}
    <View style={{ flex: 1, minWidth: 0, gap: 12, flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center' }}>
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, maxWidth: '100%', gap: 3 }}>
        <Text style={[ty.body, { color: T.label }]}>{row.name}{mine ? ` · ${props.kind === 'team' ? tr('ваша') : tr('вы')}` : ''}</Text>
        {subtitle ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{subtitle}</Text> : null}
      </View>
      <View style={{ width: pointsWidth, maxWidth: '100%', alignItems: stacked ? 'flex-start' : 'flex-end' }}>
        <Text style={[ty.headline, nums, { color: mine ? T.brandText : T.label }]} numberOfLines={1}>{points}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('баллов')}</Text>
      </View>
    </View>
  </View>;
}
