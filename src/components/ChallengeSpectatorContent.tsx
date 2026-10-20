import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SpectatorStandings } from '../data/challengeSpectator';
import { tr } from '../state/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { ChallengeResultRankingRow } from './ChallengeResultRankingRow';
import { ContentBlock } from './ContentBlock';
import { EmptyState } from './EmptyState';
import { PageHeading } from './PageHeading';
import { ScreenDescription } from './ScreenDescription';
import { SectionTabs } from './SectionTabs';
import { Wrapper } from './Wrapper';

type Row = { kind: 'team'; row: SpectatorStandings['teams'][number] } | { kind: 'member'; row: SpectatorStandings['members'][number] };
export function ChallengeSpectatorContent({ data, refreshing = false, onRefresh }: {
  data: SpectatorStandings; refreshing?: boolean; onRefresh: () => void;
}) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState(0);
  const [teamId, setTeamId] = useState<string | null>(null);
  const team = data.teams.find(t => t.id === teamId);
  const rows = useMemo<Row[]>(() => section === 0
    ? [...data.teams].sort((a, b) => a.rank - b.rank).map(row => ({ kind: 'team', row }))
    : data.members.filter(m => !team || m.teamId === team.id).sort((a, b) => a.rank - b.rank).map(row => ({ kind: 'member', row })), [data, section, team]);
  return <>
    <Wrapper padding={16} gap={10}>
      <PageHeading title={data.challenge.title} description={`${tr('День')} ${data.challenge.currentDay} ${tr('из')} ${data.challenge.durationDays}`} />
      <ScreenDescription text={tr('Режим просмотра · команды, участники и баллы. Отметки доступны только участникам челленджа.')} />
    </Wrapper>
    <Wrapper paddingHorizontal={16} paddingBottom={16}><SectionTabs items={[{ id: 0, label: tr('Рейтинг команд') }, { id: 1, label: tr('Все участники') }]}
      value={section} onChange={value => { setSection(value); setTeamId(null); }} /></Wrapper>
    {section === 1 && team ? <Wrapper paddingHorizontal={16} paddingBottom={12} gap={8}>
      <PageHeading title={team.name} description={tr('Места внутри команды')} />
      <Button variant="outline" label={tr('Показать всех участников')} onPress={() => setTeamId(null)} />
    </Wrapper> : null}
    <FlatList data={rows} keyExtractor={item => `${item.kind}-${item.row.id}`} style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}
      initialNumToRender={16} windowSize={7}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brandText} />}
      ListEmptyComponent={<EmptyState icon="person.3.fill" title={tr('Участников пока нет')} subtitle={tr('Список появится после подтверждения участников.')} />}
      renderItem={({ item }) => <Wrapper marginBottom={10}><ContentBlock size="flush">
        {item.kind === 'team' ? <>
          <ChallengeResultRankingRow kind="team" row={item.row} last />
          <Wrapper padding={12}><Button variant="outline" label={`${tr('Состав команды')} «${item.row.name}»`}
            onPress={() => { setTeamId(item.row.id); setSection(1); }} /></Wrapper>
        </> : <ChallengeResultRankingRow kind="member" row={item.row} teamRank={team ? item.row.teamRank : undefined} last />}
      </ContentBlock></Wrapper>} />
  </>;
}
