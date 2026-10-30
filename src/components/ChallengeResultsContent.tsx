import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { nums } from '../theme/tokens';
import { ChallengeResults } from '../data/community';
import { fmtInt } from '../data/format';
import * as pl from '../data/plural';
import { tr } from '../state/LanguageContext';
import { hSuccess } from '../lib/haptics';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { SF } from './SFIcon';
import { AwardBadge, AWARD_GOLD } from './AwardBadge';
import { SectionHeader } from './SectionHeader';
import { Button } from './Button';
import { ChallengeResultHero } from './ChallengeResultHero';
import { ChallengeResultMetrics } from './ChallengeResultMetrics';
import { ChallengeTeamResultsRanking } from './ChallengeTeamResultsRanking';
import { TeamResultMetric } from './TeamResultMetric';

function placeText(rank: number, total: number): string {
  if (!rank) return '—';
  return total ? `${rank} ${tr('место из')} ${total}` : `${rank} ${tr('место')}`;
}

/**
 * Разбор итогов без экранной обвязки — чтобы то же самое показать в окне
 * поздравления.
 */
export function ChallengeResultsContent({
  data,
  onOpenDays,
  onOpenStandings,
  onClaimed,
  compact,
  onClaimAward,
}: {
  data: ChallengeResults;
  onOpenDays?: () => void;
  onOpenStandings?: () => void;
  /** Награду забрали — перечитать итоги, чтобы кнопка сменилась значком. */
  onClaimed?: () => void;
  /** В модальном окне прячем переходы на другие экраны. */
  compact?: boolean;
  onClaimAward?: () => Promise<boolean>;
}) {
  const { T, ty } = useTheme();
  const c = data.challenge;
  const me = data.me;
  const team = data.team;
  const won = !!team?.isWinner;
  const [claiming, setClaiming] = useState(false);
  // Локальная отметка «забрал»: сервер уже знает, но перечитать итоги можно не
  // мгновенно, а кнопка должна смениться в ту же секунду.
  const [claimedNow, setClaimedNow] = useState(false);
  const hasAward = me?.award === true || claimedNow;
  const canClaim = me?.canClaimAward === true && !claimedNow;

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const ok = await onClaimAward?.();
      if (ok) {
        setClaimedNow(true);
        hSuccess();
        onClaimed?.();
      } else {
        Alert.alert(tr('Не удалось получить награду'), tr('Попробуйте ещё раз чуть позже.'));
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View>
      <ChallengeResultHero title={c.title} sequence={c.seq} won={won} teamName={team?.name} durationDays={c.durationDays}
        canClaim={canClaim && !!onClaimAward} claimed={hasAward} claiming={claiming} onClaim={claim} />

      {/* ── Мои цифры ──────────────────────────────────────────────────────
          Три вещи, которые человек делал каждый день. Крупно и без подписей
          мелким шрифтом: это его пятнадцать дней. */}
      {me ? (
        <>
          <SectionHeader title={tr('Ваш результат')} />
          <ChallengeResultMetrics pages={me.pages} steps={me.steps} sugarDays={me.sugarDays} />

          <Wrapper marginHorizontal={16} marginTop={10}><ContentBlock size="compact"><Wrapper dir={'row'} align={'center'} gap={14}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Очки')}</Text>
              <Text style={[ty.title2, nums, { color: T.label, marginTop: 2 }]}>
                {fmtInt(me.points)}
              </Text>
            </View>
            <View style={{ width: 0.5, alignSelf: 'stretch', backgroundColor: T.separator }} />
            <View style={{ flex: 1.3, minWidth: 0 }}>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Среди всех')}</Text>
              <Text style={[ty.title2, nums, { color: T.label, marginTop: 2 }]}>
                {placeText(me.rank, data.totalMembers)}
              </Text>
            </View>
          </Wrapper></ContentBlock></Wrapper>

          {/* Выход и вылет объясняем прямо: человек всё равно спросит, почему
              его цифры замерли, — лучше ответить здесь. */}
          {me.left || me.eliminated ? (
            <Text style={[ty.caption1, { color: T.labelSecondary, paddingHorizontal: 20, marginTop: 8 }]}>
              {me.left
                ? tr('Вы вышли по белому флагу — счёт зафиксирован на дне выхода.')
                : tr('Вы выбыли по трём флагам — счёт зафиксирован на дне вылета.')}
            </Text>
          ) : null}
        </>
      ) : null}

      {/* ── Команда ────────────────────────────────────────────────────── */}
      {team ? (
        <>
          <SectionHeader title={tr('Команда')} />
          <View style={{
            marginHorizontal: 16, backgroundColor: T.cardBg,
            borderRadius: 16, borderCurve: 'continuous',
            borderWidth: won ? 1 : 0.5, borderColor: won ? AWARD_GOLD : T.cardBorder,
            overflow: 'hidden',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous',
                backgroundColor: won ? 'rgba(240,180,41,0.16)' : T.brandTinted,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {won ? <AwardBadge size={30} /> : <SF name="person.3.fill" size={19} color={T.brand} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ty.headline, { color: T.label }]}>{team.name}</Text>
                <Text style={[ty.caption1, nums, { color: T.labelSecondary, marginTop: 1 }]}>
                  {placeText(team.rank, data.teams.length)} · {fmtInt(team.points)} pts · {pl.people(team.members)}
                </Text>
              </View>
            </View>
            <View style={{ height: 0.5, backgroundColor: T.separator, marginLeft: 14 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
              <Wrapper flex={1} basis={90}><TeamResultMetric value={fmtInt(team.pages)} label={tr('страниц')} /></Wrapper>
              <Wrapper flex={1} basis={90}><TeamResultMetric value={fmtInt(team.steps)} label={tr('шагов')} /></Wrapper>
              <Wrapper flex={1} basis={90}><TeamResultMetric value={fmtInt(team.sugarDays)} label={tr('дней без сахара')} /></Wrapper>
            </View>
          </View>
        </>
      ) : null}

      {/* Общие итоги — отдельный экран, все участники своей команды — ниже. */}
      {!compact ? (
        <>
          <Wrapper gap={10} marginHorizontal={16} marginTop={16}>
            {onOpenStandings ? <Button icon="trophy.fill" label={tr('Итоговые рейтинги')}
              accessibilityHint={tr('Рейтинг всех команд и всех участников этого челленджа')}
              onPress={onOpenStandings} /> : null}
            {onOpenDays ? <Button icon="calendar" label={tr('По дням')} onPress={onOpenDays} variant="outline" /> : null}
          </Wrapper>
          <ChallengeTeamResultsRanking data={data} />
        </>
      ) : null}
    </View>
  );
}
