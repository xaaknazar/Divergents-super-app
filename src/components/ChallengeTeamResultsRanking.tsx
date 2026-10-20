import React from 'react';
import type { ChallengeResults } from '../data/community';
import { resultTeamMembers } from '../data/challengeResults';
import { tr } from '../state/LanguageContext';
import { ChallengeResultRankingRow } from './ChallengeResultRankingRow';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { SectionHeader } from './SectionHeader';
import { Wrapper } from './Wrapper';

export function ChallengeTeamResultsRanking({ data }: { data: ChallengeResults }) {
  if (!data.team) return null;
  const rows = resultTeamMembers(data);
  return <>
    <SectionHeader title={tr('Рейтинг в вашей команде')} />
    <Wrapper marginHorizontal={16}>
      <ContentBlock size={rows.length ? 'flush' : 'regular'}>
        {rows.length ? rows.map(({ member, teamRank }, index) => (
          <ChallengeResultRankingRow key={member.id} kind="member" row={member} teamRank={teamRank} last={index === rows.length - 1} />
        )) : <ScreenDescription text={tr('Рейтинг команды пока недоступен. Обновите итоги, чтобы загрузить участников.')} />}
      </ContentBlock>
    </Wrapper>
  </>;
}
