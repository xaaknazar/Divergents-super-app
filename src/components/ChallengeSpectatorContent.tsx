import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SpectatorStandings } from '../data/challengeSpectator';
import { fmtInt } from '../data/format';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ChallengeRankingHeader, PillToggle, RankingCard, RankingTab } from './ChallengeRanking';
import { StandingsTable, StandingRow, shortPersonName, rankChangeOf } from './StandingsTable';
import { EmptyState } from './EmptyState';
import { ScreenDescription } from './ScreenDescription';
import { Wrapper } from './Wrapper';

export function ChallengeSpectatorContent({ data, refreshing = false, onRefresh }: {
  data: SpectatorStandings; refreshing?: boolean; onRefresh: () => void;
}) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<RankingTab>('teams');
  const [teamId, setTeamId] = useState<string | null>(null);
  const team = data.teams.find(t => t.id === teamId);
  const rows = useMemo<StandingRow[]>(() => tab === 'teams'
    ? [...data.teams].sort((a, b) => a.rank - b.rank).map(row => ({
      id: row.id, rank: row.rank, name: row.name, points: row.points, value: fmtInt(row.points),
      isMine: false, flags: 0, change: rankChangeOf(row),
      a11yLabel: `${row.rank} ${tr('место')}. ${row.name}. ${fmtInt(row.points)} ${tr('баллов')}`,
      a11yHint: `${tr('Состав команды')} «${row.name}»`,
      onPress: () => { setTeamId(row.id); setTab('members'); },
    }))
    : data.members.filter(m => !team || m.teamId === team.id)
      .sort((a, b) => team ? a.teamRank - b.teamRank : a.rank - b.rank).map(row => ({
        id: row.id, rank: team ? row.teamRank : row.rank, name: shortPersonName(row.name), fullName: row.name,
        subtitle: team ? `№${row.rank} · ${tr('В общем рейтинге')}` : row.teamName || tr('Без команды'),
        avatar: { uri: row.avatar },
        points: row.points, value: fmtInt(row.points), isMine: false, flags: 0, change: team ? row.teamRankChange ?? null : rankChangeOf(row),
        a11yLabel: `${team ? row.teamRank : row.rank} ${tr('место')}. ${row.name}. ${fmtInt(row.points)} ${tr('баллов')}. ${team ? `${tr('В общем рейтинге')} №${row.rank}` : row.teamName}`,
      })), [data, tab, team]);
  const day = `${tr('День')} ${data.challenge.currentDay} ${tr('из')} ${data.challenge.durationDays}`;

  return <View testID="spectator-scroll">
    <ChallengeRankingHeader />
    <Wrapper marginHorizontal={16} gap={12}>
      <RankingCard caption={`${data.challenge.title}\n${data.challenge.finished ? tr('Итоговый рейтинг') : day}`} tabs={[tr('Команды'), tr('Участники')]}
        value={tab === 'teams' ? 0 : 1} onChange={value => { setTab(value === 0 ? 'teams' : 'members'); setTeamId(null); }}>
        {tab === 'members' && team ? <Wrapper paddingHorizontal={16} gap={8} paddingBottom={8}>
          <PillToggle label={tr('Кого показать')} items={[tr('Все'), tr('Команда')]} value={1}
            onChange={value => { if (value === 0) setTeamId(null); }} />
          <ScreenDescription text={`${team.name} · ${tr('Места внутри команды')}`} />
        </Wrapper> : null}
        {rows.length ? <StandingsTable nameColumn={tab === 'teams' ? tr('Команда') : tr('Участник')}
          rows={rows} valueColumn={tr('Очки')} showMove showFlags={false} />
          : <EmptyState icon="person.3.fill" title={tr(tab === 'teams' ? 'Команд пока нет' : 'Участников пока нет')}
            subtitle={tr('Список появится после подтверждения участников.')} />}
      </RankingCard>
      <Wrapper paddingHorizontal={12} gap={6}>
        {tab === 'teams' && rows.length ? <ScreenDescription text={tr('Нажмите на команду, чтобы посмотреть состав и баллы участников.')} /> : null}
        <ScreenDescription text={tr('▲ / ▼ — изменение места относительно итогов вчера. В первый день сравнения нет.')} />
        <ScreenDescription text={tr('Режим просмотра · отметки доступны только участникам челленджа.')} />
      </Wrapper>
    </Wrapper>
  </View>;
}

const styles = StyleSheet.create({ scroll: { flex: 1 } });
