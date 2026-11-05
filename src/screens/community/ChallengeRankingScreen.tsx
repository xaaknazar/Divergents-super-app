// Единый рейтинг челленджа: команды и участники на одном экране, как
// «Rankings» в Apple Sports. Раньше это были два экрана — «Рейтинг команд» и
// «Рейтинг участников»; оба маршрута теперь открывают этот, каждый на своей
// вкладке.
//
// Данные живого челленджа приходят тем же ответом, что и трекер, поэтому экран
// открывается мгновенно. У завершённого челленджа живых данных нет — тогда
// дочитываем рейтинг из итогов.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { ChallengeRankingCard, ChallengeRankingHeader, RankingTab } from '../../components/ChallengeRanking';
import { rankChangeOf, shortPersonName, StandingRow } from '../../components/StandingsTable';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useChallengeResults } from '../../state/useChallengeResults';
import { totalFlags, OverallStanding, ResultsTeamRow, TeamStanding } from '../../data/community';

export function teamRows(teams: ReadonlyArray<TeamStanding | ResultsTeamRow>): StandingRow[] {
  return teams.map((t) => ({
    id: t.id, rank: t.rank, name: t.name,
    change: rankChangeOf(t as TeamStanding),
    flags: (t as TeamStanding).flags ?? 0,
    points: t.points, isMine: t.isMine,
  }));
}

export function memberRows(members: ReadonlyArray<OverallStanding>): StandingRow[] {
  return members.map((m) => ({
    id: m.id, rank: m.rank, name: shortPersonName(m.name), fullName: m.name,
    // Вышел по белому флагу и выбыл — разные вещи: первое разрешил капитан,
    // второе человек заработал сам.
    subtitle: [m.teamName || tr('без команды'), m.left ? `🏳️ ${tr('вышел')}` : m.eliminated ? tr('выбыл') : ''].filter(Boolean).join(' · '),
    avatar: { uri: m.avatar, eliminated: m.eliminated, left: m.left === true },
    change: rankChangeOf(m),
    flags: totalFlags(m.flags),
    points: m.points, isMine: m.isMe,
    dimmed: m.eliminated || m.left === true,
    award: m.award,
  }));
}

export function ChallengeRankingScreen({ challengeId: routeId, initialTab, onBack }: {
  challengeId?: string; initialTab: RankingTab; onBack: () => void;
}) {
  const { T, ty } = useTheme();
  const { challenge } = useChallenge(routeId);
  const challengeId = routeId ?? challenge.id;
  const [tab, setTab] = useState<RankingTab>(initialTab);

  const isLive = challenge.id === challengeId;
  const liveMembers = isLive ? challenge.overall ?? [] : [];
  const liveTeams = isLive ? challenge.teamStandings ?? [] : [];
  const needResults = !liveMembers.length && !liveTeams.length;
  const { data: results, loading, error, reload } = useChallengeResults(challengeId, 'summary', needResults);

  const teams = useMemo(() => teamRows(liveTeams.length ? liveTeams : results?.teams ?? []), [liveTeams, results]);
  const members = useMemo(() => memberRows(liveMembers.length ? liveMembers : results?.overall ?? []), [liveMembers, results]);

  const finished = needResults && results?.challenge.finished === true;
  const season = (isLive ? challenge.season : null) ?? (results?.challenge.seq || null);
  const caption = finished
    ? tr('Итоговый рейтинг')
    : isLive && challenge.currentDay > 0
      ? `${tr('День')} ${challenge.currentDay} ${tr('из')} ${challenge.totalDays}${challenge.currentDay > 1 ? ` · ${tr('изменения со вчера')}` : ''}`
      : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={onBack} />
      <Screen tabPadding={false} topInset={false}>
        <ChallengeRankingHeader season={season} />
        {needResults && !results && loading ? <ListSkeleton />
          : needResults && !results && error ? <ErrorState onRetry={reload} />
          : (
            <Wrapper marginHorizontal={16}>
              <ChallengeRankingCard tab={tab} onTab={setTab} teams={teams} members={members} caption={caption}
                emptyText={tab === 'teams' ? tr('Команды появятся здесь, когда наберут очки.') : tr('Участники появятся здесь, когда наберут очки.')} />
              <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 16, paddingTop: 10 }]}>
                {tab === 'teams'
                  ? tr('± — на сколько мест команда поднялась (▲) или опустилась (▼) со вчера. 🚩 — флаги всех участников команды. Очки команды — сумма баллов её участников.')
                  : tr('± — на сколько мест участник поднялся (▲) или опустился (▼) со вчера. 🚩 — флаги за пропуск дневной нормы. Приглушены те, кто выбыл или вышел по белому флагу.')}
              </Text>
            </Wrapper>
          )}
        <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}
