import React from 'react';
import { ChallengeSpectatorContent } from '../../components/ChallengeSpectatorContent';
import { RankingScreenFrame } from '../../components/RankingScreenFrame';
import { ChallengeSeasonSheet } from '../../components/ChallengeSeasonSheet';
import { ErrorState, ListSkeleton } from '../../components/StateViews';
import { useSpectatorStandings } from '../../state/useSpectatorStandings';
import { useChallengeSeasons } from '../../state/useChallengeSeasons';
export function ChallengeSpectatorScreen({ challengeId, onBack }: { challengeId: string; onBack: () => void }) {
  const seasons = useChallengeSeasons(challengeId);
  const { data, loading, error, reload } = useSpectatorStandings(seasons.selected);
  return <>
    <RankingScreenFrame onBack={onBack} season={data?.challenge.season ?? seasons.seasons.find(s => s.id === seasons.selected)?.season}
      onSeason={() => seasons.setOpen(true)} refreshing={loading} onRefresh={reload} resetKey={seasons.selected}>
      {!data ? loading ? <ListSkeleton /> : <ErrorState message="Не удалось загрузить рейтинг этого сезона." onRetry={reload} /> : <>
        {error ? <ErrorState message="Не удалось обновить. Ниже сохранённый рейтинг." onRetry={reload} /> : null}
        <ChallengeSpectatorContent key={seasons.selected} data={data} onRefresh={reload} />
      </>}
    </RankingScreenFrame>
    <ChallengeSeasonSheet visible={seasons.open} seasons={seasons.seasons} selected={seasons.selected} loading={seasons.loading}
      error={seasons.error} onRetry={seasons.retry} onClose={() => seasons.setOpen(false)} onSelect={seasons.choose} />
  </>;
}
