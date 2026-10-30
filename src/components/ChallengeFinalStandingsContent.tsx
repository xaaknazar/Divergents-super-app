import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChallengeResults, OverallStanding, ResultsTeamRow } from '../data/community';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { ChallengeResultRankingRow } from './ChallengeResultRankingRow';
import { ContentBlock } from './ContentBlock';
import { EmptyState } from './EmptyState';
import { PageHeading } from './PageHeading';
import { SectionTabs } from './SectionTabs';
import { Wrapper } from './Wrapper';

type Entry = { kind: 'team'; row: ResultsTeamRow } | { kind: 'member'; row: OverallStanding };

/** Only final results for the requested challenge: never the current challenge context. */
export function ChallengeFinalStandingsContent({ data, refreshing = false, onRefresh }: {
  data: ChallengeResults; refreshing?: boolean; onRefresh?: () => void;
}) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState(0);
  const entries = useMemo<Entry[]>(() => section === 0
    ? [...data.teams].sort((a, b) => a.rank - b.rank).map(row => ({ kind: 'team', row }))
    : [...data.overall].sort((a, b) => a.rank - b.rank).map(row => ({ kind: 'member', row })), [data, section]);
  return <>
    <Wrapper paddingHorizontal={16} paddingVertical={16}>
      <PageHeading title={data.challenge.title}
        description={data.challenge.finished ? tr('Итоговый рейтинг за весь челлендж') : tr('Предварительный рейтинг — челлендж ещё идёт')} />
    </Wrapper>
    <Wrapper paddingHorizontal={16} paddingBottom={16}><SectionTabs value={section} onChange={setSection} items={[
      { id: 0, label: tr('Рейтинг команд') }, { id: 1, label: tr('Рейтинг всех участников') },
    ]} /></Wrapper>
    <FlatList key={section} data={entries} keyExtractor={item => `${item.kind}-${item.row.id}`}
      testID="challenge-final-standings-list" style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}
      initialNumToRender={16} windowSize={7}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brandText} /> : undefined}
      ListEmptyComponent={<EmptyState icon="list.number" title={tr('Рейтинг пока недоступен')}
        subtitle={tr('Данные не загрузились или список пуст. Попробуйте обновить итоги.')}
        actionLabel={onRefresh ? tr('Обновить') : undefined} onAction={onRefresh} />}
      renderItem={({ item }) => <Wrapper marginBottom={8}><ContentBlock size="flush">
        <ChallengeResultRankingRow {...item} last />
      </ContentBlock></Wrapper>} />
  </>;
}
