import { RankingScreenFrame } from '../../components/RankingScreenFrame';
import { ChallengeSeasonSheet } from '../../components/ChallengeSeasonSheet';
import { ChallengeSpectatorContent } from '../../components/ChallengeSpectatorContent';
import { useChallengeSeasons } from '../../state/useChallengeSeasons';
import { useSpectatorStandings } from '../../state/useSpectatorStandings';
// Единый рейтинг челленджа: команды и участники на одном экране, как
// «Rankings» в Apple Sports. Раньше это были два экрана — «Рейтинг команд» и
// «Рейтинг участников»; оба маршрута теперь открывают этот, каждый на своей
// вкладке.
//
// Период «Весь челлендж | Сегодня» — над карточкой и меняет обе таблицы:
// у команд «Сегодня» — сумма очков её участников за день, у участников —
// очки за день и цели дня (цели сервер присылает для своей команды).
// У участников — фильтр «Все | Моя команда», места при этом остаются общими.
//
// Данные живого челленджа приходят тем же ответом, что и трекер, поэтому экран
// открывается мгновенно. У завершённого челленджа живых данных нет — тогда
// дочитываем рейтинг из итогов.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Segmented } from '../../components/Segmented';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { Wrapper } from '../../components/Wrapper';
import { ColorWash, useColorWash } from '../../components/ColorWash';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { ChallengeRankingCard, ChallengeRankingHeader, PillToggle, RankingPeriod, RankingTab } from '../../components/ChallengeRanking';
import { memberRows, memberTodayRows, teamRows, teamTodayRows } from '../../components/challengeRankingRows';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useChallengeResults } from '../../state/useChallengeResults';

export function ChallengeRankingScreen({ challengeId: routeId, initialTab, onBack }: {
  challengeId?: string; initialTab: RankingTab; onBack: () => void;
}) {
  const { T, ty } = useTheme();
  const { challenge, leaderboard } = useChallenge(routeId);
  const challengeId = routeId ?? challenge.id;
  const seasons = useChallengeSeasons(challengeId);
  const otherSeason = seasons.selected !== challengeId;
  const archived = useSpectatorStandings(seasons.selected, otherSeason);
  const [tab, setTab] = useState<RankingTab>(initialTab);
  const [period, setPeriod] = useState<RankingPeriod>('overall');
  const [mineOnly, setMineOnly] = useState(false);
  const wash = useColorWash();

  const isLive = challenge.id === challengeId;
  const liveMembers = isLive ? challenge.overall ?? [] : [];
  const liveTeams = isLive ? challenge.teamStandings ?? [] : [];
  const needResults = !liveMembers.length && !liveTeams.length;
  const { data: results, loading, error, reload } = useChallengeResults(challengeId, 'summary', needResults);

  // «Сегодня» есть только у идущего челленджа: у завершённого дня уже нет.
  const hasToday = isLive && challenge.currentDay > 0 && liveMembers.length > 0;
  const showToday = hasToday && period === 'today';
  const allMembers = liveMembers.length ? liveMembers : results?.overall ?? [];
  const myTeamId = isLive ? challenge.teamId ?? null : allMembers.find((m) => m.isMe)?.teamId ?? null;
  const shownMembers = mineOnly && myTeamId ? allMembers.filter((m) => m.teamId === myTeamId) : allMembers;
  const tasks = useMemo(() => new Map((isLive ? leaderboard : []).map((m) => [m.id, m.todayTasks] as const)), [isLive, leaderboard]);

  const rows = useMemo(() => {
    if (tab === 'teams') return showToday ? teamTodayRows(liveTeams, liveMembers) : teamRows(liveTeams.length ? liveTeams : results?.teams ?? []);
    return showToday ? memberTodayRows(allMembers, tasks).filter(row => !mineOnly || !myTeamId || allMembers.find(m => m.id === row.id)?.teamId === myTeamId) : memberRows(shownMembers);
  }, [tab, showToday, liveTeams, liveMembers, results, shownMembers, allMembers, mineOnly, myTeamId, tasks]);

  const finished = needResults && results?.challenge.finished === true;
  const season = (isLive ? challenge.season : null) ?? (results?.challenge.seq || null);
  const caption = finished
    ? tr('Итоговый рейтинг')
    : showToday
      ? `${tr('День')} ${challenge.currentDay} · ${tr('очки за сегодня')} · ${tr('движение к итогу вчера')}`
    : isLive && challenge.currentDay > 0
      ? `${tr('День')} ${challenge.currentDay} ${tr('из')} ${challenge.totalDays}${challenge.currentDay > 1 ? ` · ${tr('изменения со вчера')}` : ''}`
      : undefined;

  return (
    <>
      <RankingScreenFrame onBack={onBack} season={otherSeason ? archived.data?.challenge.season ?? seasons.seasons.find(s => s.id === seasons.selected)?.season : season}
        onSeason={() => seasons.setOpen(true)} resetKey={seasons.selected}
        onRefresh={otherSeason ? archived.reload : needResults ? reload : undefined} refreshing={otherSeason ? archived.loading && !!archived.data : loading && !!results}>
      {otherSeason && archived.error && archived.data ? <ErrorState onRetry={archived.reload} /> : null}
      {otherSeason ? archived.data ? <ChallengeSpectatorContent key={seasons.selected} data={archived.data} onRefresh={archived.reload} />
        : archived.loading ? <ListSkeleton /> : <ErrorState onRetry={archived.reload} /> : <>
        <ChallengeRankingHeader />
        {hasToday ? (
          <Wrapper marginHorizontal={16} marginBottom={12}>
            <Segmented variant={wash ? 'glass' : 'standard'} items={[tr('Весь челлендж'), tr('Сегодня')]} value={period === 'overall' ? 0 : 1}
              onChange={(i) => setPeriod(i === 0 ? 'overall' : 'today')} />
          </Wrapper>
        ) : null}
        {needResults && !results && loading ? <ListSkeleton />
          : needResults && !results && error ? <ErrorState onRetry={reload} />
          : (
            <Wrapper marginHorizontal={16}>
              <ChallengeRankingCard tab={tab} onTab={setTab} rows={rows} period={showToday ? 'today' : 'overall'} caption={caption}
                filter={tab === 'members' && myTeamId ? (
                  <PillToggle label={tr('Кого показать')} items={[tr('Все'), tr('Моя команда')]} value={mineOnly ? 1 : 0} onChange={(i) => setMineOnly(i === 1)} />
                ) : null}
                emptyText={tab === 'teams' ? tr('Команды появятся здесь, когда наберут очки.') : tr('Участники появятся здесь, когда наберут очки.')} />
              <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 16, paddingTop: 10 }]}>
                {showToday
                  ? tab === 'teams'
                    ? tr('Сегодня — сумма очков участников команды за день. 🚩 — флаги всех участников команды.')
                    : tr('Сегодня — очки за день. Значки — цели дня вашей команды: страницы, без сахара, шаги. Зелёный — выполнено, красный — нет, серый — ещё не отмечено.')
                  : tab === 'teams'
                    ? tr('± — на сколько мест команда поднялась (▲) или опустилась (▼) со вчера. 🚩 — флаги всех участников команды. Очки команды — сумма баллов её участников.')
                    : `${tr('± — на сколько мест участник поднялся (▲) или опустился (▼) со вчера. 🚩 — флаги за пропуск дневной нормы. Приглушены те, кто выбыл или вышел по белому флагу.')}${mineOnly ? ` ${tr('Места — в общем рейтинге.')}` : ''}`}
              </Text>
            </Wrapper>
          )}
        <View style={{ height: 30 }} />
      </>}
      </RankingScreenFrame>
      <ChallengeSeasonSheet visible={seasons.open} seasons={seasons.seasons} selected={seasons.selected} loading={seasons.loading}
        error={seasons.error} onRetry={seasons.retry} onClose={() => seasons.setOpen(false)} onSelect={seasons.choose} />
    </>
  );
}
