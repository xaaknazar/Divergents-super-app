// Итоги челленджа: что человек сделал за все дни и чем закончила команда.
//
// Это единственный экран, который люди увидят после финиша, — и ради него они
// пятнадцать дней отмечались. Поэтому здесь не таблица, а разбор: крупные
// цифры своего результата, место среди всех, итог команды и тройка лучших.
//
// Содержимое вынесено в `ChallengeResultsContent` и переиспользуется окном
// поздравления при запуске (ChallengeResultsModal): две копии одной вёрстки
// разошлись бы после первой же правки.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Logo } from '../../components/Logo';
import { AwardBadge, AWARD_GOLD, AWARD_GOLD_DEEP } from '../../components/AwardBadge';
import { MemberAvatar } from '../../components/MemberAvatar';
import { ErrorState } from '../../components/StateViews';
import { fetchChallengeResults, claimChallengeAward, ChallengeResults } from '../../data/community';
import { fmtInt } from '../../data/format';
import { tr } from '../../state/LanguageContext';
import { hSuccess } from '../../lib/haptics';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeResults'>;

/** Место словами: «1 место из 160». Ноль — значит места нет, и врать не надо. */
function placeText(rank: number, total: number): string {
  if (!rank) return '—';
  return total ? `${rank} ${tr('место из')} ${total}` : `${rank} ${tr('место')}`;
}

export function ChallengeResultsScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const { challengeId } = route.params;
  const [data, setData] = useState<ChallengeResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const res = await fetchChallengeResults(challengeId, token);
      if (!res) setError(true);
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Итоги')} onBack={() => navigation.goBack()} hairline />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      ) : !data ? (
        <ErrorState
          message={tr('Не удалось загрузить итоги. Проверьте подключение и попробуйте снова.')}
          onRetry={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 34 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand} />}
        >
          <ChallengeResultsContent
            data={data}
            onClaimed={load}
            onOpenDays={() => navigation.navigate('ChallengeDays', { challengeId })}
            onOpenStandings={() => navigation.navigate('OverallStandings', { challengeId })}
          />
        </ScrollView>
      )}
      {error && data ? null : null}
    </View>
  );
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
}: {
  data: ChallengeResults;
  onOpenDays?: () => void;
  onOpenStandings?: () => void;
  /** Награду забрали — перечитать итоги, чтобы кнопка сменилась значком. */
  onClaimed?: () => void;
  /** В модальном окне прячем переходы на другие экраны. */
  compact?: boolean;
}) {
  const { T, ty } = useTheme();
  const { getToken } = useAuth();
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
      const token = await getToken();
      const ok = await claimChallengeAward(c.id, token);
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
      {/* ── Шапка ───────────────────────────────────────────────────────────
          Победа и просто финиш выглядят по-разному намеренно: одинаковая
          шапка обесценила бы первое место. */}
      <LinearGradient
        colors={won ? [AWARD_GOLD, '#E08A00'] : [T.brand, T.brandAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ margin: 16, borderRadius: 20, borderCurve: 'continuous', padding: 18, overflow: 'hidden' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={26} body="#fff" head="#fff" />
          {/* «1-й челлендж» — то, как о нём говорят сами участники. Название
              оставляем рядом: у следующих челленджей оно будет разным. */}
          <Text style={[ty.footnoteEm, { color: 'rgba(255,255,255,0.9)', flex: 1 }]} numberOfLines={1}>
            {c.seq ? `${c.seq}-${tr('й челлендж')}` : ''}
            {c.seq && c.title ? ' · ' : ''}
            {c.title}
          </Text>
        </View>

        <Text style={[ty.title1, { color: '#fff', marginTop: 10 }]}>
          {won ? tr('1 место!') : tr('Челлендж завершён')}
        </Text>

        {won ? (
          <>
            <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.95)', marginTop: 4 }]}>
              {tr('Команда')} «{team?.name}» {tr('победила')}.
            </Text>

            {/* Награда — это подарок, и его забирают. Значок, появившийся сам,
                читается как часть интерфейса; нажатая кнопка — как награда. */}
            {canClaim ? (
              <Pressable
                onPress={claim}
                disabled={claiming}
                accessibilityRole="button"
                accessibilityLabel={tr('Получить награду')}
                style={({ pressed }) => ({
                  marginTop: 14, minHeight: 48, borderRadius: 14, borderCurve: 'continuous',
                  backgroundColor: pressed ? 'rgba(255,255,255,0.82)' : '#fff',
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  opacity: claiming ? 0.7 : 1,
                })}
              >
                <SF name="trophy.fill" size={18} color={AWARD_GOLD_DEEP} />
                <Text style={[ty.headline, { color: AWARD_GOLD_DEEP }]}>
                  {claiming ? tr('Получаем…') : tr('Получить награду')}
                </Text>
              </Pressable>
            ) : hasAward ? (
              <View style={{
                marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
                alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12,
                borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.22)',
              }}>
                <SF name="trophy.fill" size={16} color="#fff" />
                <Text style={[ty.footnoteEm, { color: '#fff' }]}>
                  {tr('Награда у вас — она рядом с вашим ником')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[ty.subhead, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>
            {pl.days(c.durationDays)} {tr('позади')}. {tr('Вот что у вас получилось')}.
          </Text>
        )}
      </LinearGradient>

      {/* ── Мои цифры ──────────────────────────────────────────────────────
          Три вещи, которые человек делал каждый день. Крупно и без подписей
          мелким шрифтом: это его пятнадцать дней. */}
      {me ? (
        <>
          <SectionTitle>{tr('Ваш результат')}</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
            <BigStat icon="book.fill" value={fmtInt(me.pages)} label={tr('страниц')} color={T.brand} />
            <BigStat icon="figure.walk" value={fmtInt(me.steps)} label={tr('шагов')} color="#30B0C7" />
            <BigStat icon="cube.fill" value={fmtInt(me.sugarDays)} label={tr('дней без сахара')} color="#34C759" />
          </View>

          <View style={{
            marginHorizontal: 16, marginTop: 10, backgroundColor: T.cardBg,
            borderRadius: 16, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.cardBorder,
            padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
          }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Очки')}</Text>
              <Text style={[ty.title2, nums, { color: T.label, marginTop: 2 }]} numberOfLines={1}>
                {fmtInt(me.points)}
              </Text>
            </View>
            <View style={{ width: 0.5, alignSelf: 'stretch', backgroundColor: T.separator }} />
            <View style={{ flex: 1.3, minWidth: 0 }}>
              <Text style={[ty.caption1, { color: T.labelSecondary }]}>{tr('Среди всех')}</Text>
              <Text style={[ty.title2, nums, { color: T.label, marginTop: 2 }]} numberOfLines={1}>
                {placeText(me.rank, data.totalMembers)}
              </Text>
            </View>
          </View>

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
          <SectionTitle>{tr('Команда')}</SectionTitle>
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
                <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{team.name}</Text>
                <Text style={[ty.caption1, nums, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                  {placeText(team.rank, data.teams.length)} · {fmtInt(team.points)} pts · {pl.people(team.members)}
                </Text>
              </View>
            </View>
            <View style={{ height: 0.5, backgroundColor: T.separator, marginLeft: 14 }} />
            <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
              <TeamStat value={fmtInt(team.pages)} label={tr('страниц')} />
              <TeamStat value={fmtInt(team.steps)} label={tr('шагов')} />
              <TeamStat value={fmtInt(team.sugarDays)} label={tr('дней без сахара')} last />
            </View>
          </View>
        </>
      ) : null}

      {/* ── Тройка лучших ──────────────────────────────────────────────── */}
      {data.podium.length ? (
        <>
          <SectionTitle>{tr('Лучшие в общем зачёте')}</SectionTitle>
          <View style={{
            marginHorizontal: 16, backgroundColor: T.cardBg,
            borderRadius: 16, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.cardBorder,
            overflow: 'hidden',
          }}>
            {data.podium.map((p, i) => (
              <View key={p.userId}>
                {i > 0 ? <View style={{ height: 0.5, backgroundColor: T.separator, marginLeft: 58 }} /> : null}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14,
                  backgroundColor: p.isMe ? T.brandTinted : 'transparent',
                }}>
                  <Text style={[ty.footnoteEm, nums, { width: 16, color: T.labelSecondary }]}>{p.rank}</Text>
                  <MemberAvatar name={p.name} avatar={p.avatar} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={[ty.body, { color: T.label, flexShrink: 1 }]} numberOfLines={1}>{p.name}</Text>
                      {p.award ? <AwardBadge size={15} /> : null}
                    </View>
                    <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{p.teamName}</Text>
                  </View>
                  <Text style={[ty.footnoteEm, nums, { color: T.brand }]}>{fmtInt(p.points)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ── Куда дальше ────────────────────────────────────────────────── */}
      {!compact ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
          {onOpenDays ? <LinkTile icon="calendar" label={tr('По дням')} onPress={onOpenDays} /> : null}
          {onOpenStandings ? <LinkTile icon="list.number" label={tr('Общий рейтинг')} onPress={onOpenStandings} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { T, ty } = useTheme();
  return (
    <Text style={[ty.footnote, {
      color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8,
      textTransform: 'uppercase', letterSpacing: 0.4,
    }]}>
      {children}
    </Text>
  );
}

function BigStat({ icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  const { T, ty } = useTheme();
  return (
    <View style={{
      flex: 1, backgroundColor: T.cardBg, borderRadius: 16, borderCurve: 'continuous',
      borderWidth: 0.5, borderColor: T.cardBorder, paddingVertical: 14, paddingHorizontal: 10,
      alignItems: 'center', gap: 6,
    }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10, borderCurve: 'continuous',
        backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center',
      }}>
        <SF name={icon} size={15} color={color} />
      </View>
      <Text style={[ty.title3, nums, { color: T.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={[ty.caption2, { color: T.labelSecondary, textAlign: 'center' }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function TeamStat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  const { T, ty } = useTheme();
  return (
    <View style={{
      flex: 1, alignItems: 'center',
      borderRightWidth: last ? 0 : 0.5, borderRightColor: T.separator,
    }}>
      <Text style={[ty.subheadEm, nums, { color: T.label }]} numberOfLines={1}>{value}</Text>
      <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function LinkTile({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const { T, ty } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: pressed ? T.fillTertiary : T.cardBg,
        borderRadius: 14, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.cardBorder,
      })}
    >
      <SF name={icon} size={15} color={T.brand} />
      <Text style={[ty.footnoteEm, { color: T.label }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
