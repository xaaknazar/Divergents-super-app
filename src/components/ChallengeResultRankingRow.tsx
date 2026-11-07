import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { OverallStanding, ResultsTeamRow } from '../data/community';
import { fmtInt } from '../data/format';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { MemberAvatar } from './MemberAvatar';
import { RankMedal } from './RankMedal';
import { RankMovement } from './RankMovement';

type MemberRow = Pick<OverallStanding, 'id' | 'name' | 'rank' | 'points' | 'teamName'>
  & Partial<Pick<OverallStanding, 'avatar' | 'isMe' | 'left' | 'eliminated' | 'award' | 'rankChange' | 'teamRankChange'>>;
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
  const subtitle = props.kind === 'team' ? ''
    : props.teamRank ? status : [props.row.teamName || tr('Без команды'), status].filter(Boolean).join(' · ');
  // Keep safeSpaces from fmtInt: Gotham Rounded has an oversized NBSP glyph.
  const points = fmtInt(row.points);
  const rankWidth = Math.max(38, Math.ceil(String(rank).length * (ty.footnoteEm.fontSize ?? 13) * fontScale * 0.68 + 4));
  const pointsWidth = Math.ceil(Math.max(points.length * (ty.headline.fontSize ?? 17),
    tr('баллов').length * (ty.caption1.fontSize ?? 12)) * fontScale * 0.68 + 4);
  const contentWidth = (rowWidth ?? width - 32) - 32 - rankWidth - (props.kind === 'member' ? 46 : 0) - 46;
  const stacked = contentWidth - pointsWidth - 12 < 120 * textScale * fontScale;
  return <View testID={`result-ranking-${props.kind}-${row.id}`} accessible
    onLayout={event => setRowWidth(event.nativeEvent.layout.width)}
    accessibilityLabel={`${rank} ${tr('место')}. ${row.name}${mine ? `, ${props.kind === 'team' ? tr('ваша команда') : tr('вы')}` : ''}. ${fmtInt(row.points)} ${tr('баллов')}${subtitle ? `. ${subtitle}` : ''}`}
    style={{ padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center',
      backgroundColor: mine ? T.brandTinted : T.cardBg,
      borderBottomWidth: props.last ? 0 : 0.5, borderBottomColor: T.separator }}>
    <View style={{ width: rankWidth, alignItems: 'center' }}><RankMedal rank={rank} /></View>
    {props.kind === 'member'
      ? <MemberAvatar name={row.name} avatar={props.row.avatar} size={34} eliminated={props.row.eliminated} left={props.row.left === true} />
      : null}
    <View style={{ flex: 1, minWidth: 0, gap: 12, flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center' }}>
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, maxWidth: '100%', gap: 3 }}>
        <Text style={[ty.body, { color: T.label }]}>{row.name}{mine ? ` · ${props.kind === 'team' ? tr('ваша') : tr('вы')}` : ''}</Text>
        {subtitle ? <Text style={[ty.caption1, { color: T.labelSecondary }]}>{subtitle}</Text> : null}
      </View>
    <RankMovement change={props.kind === 'member' && props.teamRank ? props.row.teamRankChange ?? null : props.row.rankChange ?? null} />
      <View style={{ width: pointsWidth, maxWidth: '100%', alignItems: stacked ? 'flex-start' : 'flex-end' }}>
        <Text style={[ty.headline, nums, { color: mine ? T.brandText : T.label }]} numberOfLines={1}>{points}</Text>
        <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('баллов')}</Text>
      </View>
    </View>
  </View>;
}
