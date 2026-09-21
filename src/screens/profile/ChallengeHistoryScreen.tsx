// История всех челленджей пользователя: где участвовал, в какой команде и с
// каким статусом заявки. Открывается по тапу на плитку «День» в профиле.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { fetchMyChallengeHistory, ChallengeHistoryItem } from '../../data/community';
import { fmtInt } from '../../data/format';
import { nums } from '../../theme/tokens';
import { AwardBadge, AWARD_GOLD, AWARD_GOLD_DEEP } from '../../components/AwardBadge';
import { tr } from '../../state/LanguageContext';
import type { Theme } from '../../theme/tokens';
import * as pl from '../../data/plural';

// Text colours come from the theme (accessible *Text variants), so the capsule
// labels pass contrast in both light and dark.
const APP_STATUS = (T: Theme): Record<string, { label: string; color: string; bg: string }> => ({
  pending: { label: 'На рассмотрении', color: T.labelSecondary, bg: 'rgba(142,142,147,0.16)' },
  approved: { label: 'Участвую', color: T.greenText, bg: 'rgba(52,199,89,0.16)' },
  rejected: { label: 'Отклонена', color: T.redText, bg: 'rgba(255,59,48,0.14)' },
});

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ChallengeHistoryScreen({ navigation }: { navigation: { goBack: () => void; getParent: () => any } }) {
  const { T, ty } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [items, setItems] = useState<ChallengeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // A failed fetch must not masquerade as «Пока нет челленджей».
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      setItems(await fetchMyChallengeHistory(token));
    } catch {
      setError(true);
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  const statuses = APP_STATUS(T);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  // Идущий челлендж открывается в трекере, завершённый — в итогах: возвращать
  // человека на экран отметок, которые уже не принимаются, незачем.
  const open = (item: ChallengeHistoryItem) =>
    navigation.getParent()?.navigate('CommunityTab', {
      screen: item.finished && item.result ? 'ChallengeResults' : 'ChallengeDetail',
      params: { challengeId: item.challengeId },
      initial: false,
    });

  // Делим ПО ДАТАМ, а не по статусу в базе: `archived` ставится руками и
  // запаздывает — пятнадцатый день прошёл, а челлендж всё ещё «active».
  const active = items.filter((i) => !i.finished);
  const past = items.filter((i) => i.finished);

  const Row = ({ item }: { item: ChallengeHistoryItem }) => {
    const st = statuses[item.status] ?? statuses.pending;
    const r = item.result;
    const won = r?.isWinnerTeam === true;
    return (
      <Pressable onPress={() => open(item)} accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${r ? `${r.rank} место, ${fmtInt(r.points)} очков` : st.label}`}
        style={({ pressed }) => ({
          backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 10,
          borderRadius: 16, borderCurve: 'continuous',
          borderWidth: won ? 1 : 0.5, borderColor: won ? AWARD_GOLD : T.cardBorder,
          opacity: pressed ? 0.85 : 1, overflow: 'hidden',
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{
            width: 42, height: 42, borderRadius: 12, borderCurve: 'continuous',
            backgroundColor: won ? 'rgba(240,180,41,0.16)' : T.brandTinted,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {won ? <AwardBadge size={26} /> : <SF name="flame.fill" size={19} color={T.brand} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[ty.headline, { color: T.label, flexShrink: 1 }]} numberOfLines={2}>{item.title}</Text>
              {r?.award ? <AwardBadge size={15} /> : null}
            </View>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 2 }]} numberOfLines={2}>
              {[item.seq ? `${item.seq}-й челлендж` : null,
                item.teamName ? `Команда «${item.teamName}»` : null,
                item.durationDays ? pl.days(item.durationDays) : null,
                fmtDate(item.startISO)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {/* У завершённого важнее место, чем статус заявки: «Участвую» после
              финиша ничего не сообщает. */}
          {item.finished && r ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[ty.subheadEm, nums, { color: won ? AWARD_GOLD_DEEP : T.brand }]} numberOfLines={1}>
                {r.rank ? `${r.rank} ${tr('место')}` : '—'}
              </Text>
              <Text style={[ty.caption2, nums, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                {fmtInt(r.points)} pts
              </Text>
            </View>
          ) : (
            <Capsule bg={st.bg} color={st.color}>{st.label}</Capsule>
          )}
        </View>

        {/* Три цифры, ради которых всё и было. Показываем только у завершённых:
            у идущего они меняются каждый день и живут на экране трекера. */}
        {item.finished && r ? (
          <>
            <View style={{ height: 0.5, backgroundColor: T.separator, marginLeft: 14 }} />
            <View style={{ flexDirection: 'row', paddingVertical: 9 }}>
              <MiniStat value={fmtInt(r.pages)} label={tr('страниц')} />
              <MiniStat value={fmtInt(r.steps)} label={tr('шагов')} />
              <MiniStat value={fmtInt(r.sugarDays)} label={tr('дней без сахара')} last />
            </View>
          </>
        ) : null}
      </Pressable>
    );
  };

  const MiniStat = ({ value, label, last }: { value: string; label: string; last?: boolean }) => (
    <View style={{ flex: 1, alignItems: 'center', borderRightWidth: last ? 0 : 0.5, borderRightColor: T.separator }}>
      <Text style={[ty.footnoteEm, nums, { color: T.label }]} numberOfLines={1}>{value}</Text>
      <Text style={[ty.caption2, { color: T.labelSecondary, marginTop: 1, textAlign: 'center' }]} numberOfLines={2}>{label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Мои челленджи')} onBack={() => navigation.goBack()} hairline />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      ) : error && items.length === 0 ? (
        <ErrorState message={tr('Не удалось загрузить историю челленджей. Проверьте подключение.')} onRetry={() => { setLoading(true); load(); }} />
      ) : items.length === 0 ? (
        <EmptyState icon="flame.fill" title={tr('Пока нет челленджей')}
          subtitle={tr('Вступите в челлендж в разделе «Сообщество» — он появится здесь.')} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 10, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand} />}
        >
          {active.length > 0 ? (
            <>
              <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
                {tr('Текущие')} · {active.length}
              </Text>
              {active.map((i) => <Row key={i.challengeId} item={i} />)}
            </>
          ) : null}
          {past.length > 0 ? (
            <>
              <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
                {tr('Завершённые')} · {past.length}
              </Text>
              {past.map((i) => <Row key={i.challengeId} item={i} />)}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
