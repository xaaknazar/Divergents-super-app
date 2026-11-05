// Рейтинг челленджа как в Apple Sports: крупная шапка с логотипом и капсулой
// сезона, ниже одна карточка «Рейтинг» с переключателем «Команды | Участники».
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Logo } from './Logo';
import { Segmented } from './Segmented';
import { StandingsTable, StandingRow } from './StandingsTable';
import { tr } from '../state/LanguageContext';

export type RankingTab = 'teams' | 'members';

export function ChallengeRankingHeader({ title = 'Divergents Challenge', season }: { title?: string; season?: number | null }) {
  const { T, ty, isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
      <View accessible accessibilityRole="header" accessibilityLabel={title}
        style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
        <Logo size={34} body={isDark ? '#FFFFFF' : undefined} />
        <Text style={[ty.title1, { color: T.label, flexShrink: 1 }]} numberOfLines={2}>{title}</Text>
      </View>
      {season ? (
        <View testID="ranking-season" accessible accessibilityLabel={`${tr('Сезон')} ${season}`}
          style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderCurve: 'continuous',
            justifyContent: 'center', backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{tr('Сезон')} {season}</Text>
        </View>
      ) : null}
    </View>
  );
}

export interface ChallengeRankingCardProps {
  tab: RankingTab;
  onTab?: (tab: RankingTab) => void;
  teams: StandingRow[];
  members: StandingRow[];
  /** Под заголовком: «День 9 из 21 · изменения со вчера». */
  caption?: string;
  /** Пустой список — текст вместо таблицы. */
  emptyText?: string;
}

const TABS: RankingTab[] = ['teams', 'members'];

export function ChallengeRankingCard({ tab, onTab, teams, members, caption, emptyText }: ChallengeRankingCardProps) {
  const { T, ty } = useTheme();
  const rows = tab === 'teams' ? teams : members;
  return (
    <View testID="challenge-ranking-card" style={{ backgroundColor: T.cardBg, borderRadius: radius.block, borderCurve: 'continuous', overflow: 'hidden', paddingTop: 16, paddingBottom: 8 }}>
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center' }]}>{tr('Рейтинг')}</Text>
      {caption ? <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginTop: 2, paddingHorizontal: 16 }]}>{caption}</Text> : null}
      <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
        <Segmented items={[tr('Команды'), tr('Участники')]} value={TABS.indexOf(tab)} onChange={onTab ? (i) => onTab(TABS[i]) : undefined} />
      </View>
      {rows.length ? (
        <StandingsTable nameColumn={tab === 'teams' ? tr('Команда') : tr('Участник')} rows={rows} />
      ) : (
        <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 24 }]}>
          {emptyText ?? tr('Рейтинг ещё пуст')}
        </Text>
      )}
    </View>
  );
}
