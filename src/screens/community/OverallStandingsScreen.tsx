// Рейтинг всех участников челленджа — не только своей команды.
//
// Данные приходят тем же ответом, что и трекер (challenge.overall): очки всех
// участников сервер уже посчитал ради командного зачёта, и второй запрос ради
// того же результата был бы напрасным. Поэтому экран открывается мгновенно.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { nums } from '../../theme/tokens';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { MemberAvatar } from '../../components/MemberAvatar';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { MEDAL_FOR_RANK, totalFlags, OverallStanding } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'OverallStandings'>;

export function OverallStandingsScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { challenge } = useChallenge();
  const all = challenge.overall ?? [];

  // Фильтр «только моя команда» — при полутора сотнях участников найти своих
  // в общем списке иначе тяжело.
  const [mineOnly, setMineOnly] = useState(false);
  const myTeamId = challenge.teamId ?? null;
  const rows = useMemo(
    () => (mineOnly && myTeamId ? all.filter((r) => r.teamId === myTeamId) : all),
    [all, mineOnly, myTeamId],
  );

  const me = all.find((r) => r.isMe) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Рейтинг участников')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
            {pl.people(all.length)}{challenge.title ? ` · ${challenge.title}` : ''}
          </Text>
        </View>

        {/* Своё место — крупно и сразу, чтобы не искать себя в списке. */}
        {me ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, borderCurve: 'continuous', backgroundColor: T.brandTinted, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MemberAvatar name={me.name} avatar={me.avatar} size={40} eliminated={me.eliminated} left={me.left === true} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{tr('Вы')} · {me.name}</Text>
              <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                {me.teamName || tr('без команды')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[ty.title3, nums, { color: T.brand }]}>{me.rank} {tr('место')}</Text>
              <Text style={[ty.caption1, nums, { color: T.labelSecondary }]}>{me.points} pts</Text>
            </View>
          </View>
        ) : null}

        {myTeamId ? (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
            {[false, true].map((only) => (
              <Pressable
                key={String(only)}
                onPress={() => setMineOnly(only)}
                accessibilityRole="button"
                accessibilityState={{ selected: mineOnly === only }}
                style={{
                  paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: mineOnly === only ? T.brand : T.fillSecondary,
                }}
              >
                <Text style={[ty.caption1, { color: mineOnly === only ? '#fff' : T.label }]}>
                  {only ? tr('Моя команда') : tr('Все')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon="list.number"
            title={tr('Рейтинг ещё пуст')}
            subtitle={tr('Участники появятся здесь, когда наберут очки.')}
          />
        ) : (
          <ListSection
            header={mineOnly ? tr('Моя команда') : tr('Все участники')}
            footer={tr('🚩 — флаги за пропуск дневной нормы. ⛔ — участник выбыл, очки заморожены. 🏳️ — вышел по белому флагу капитана.')}
          >
            {rows.map((r, i) => (
              <Row key={r.id} row={r} last={i === rows.length - 1} />
            ))}
          </ListSection>
        )}

        <View style={{ height: 30 }} />
      </Screen>
    </View>
  );
}

function Row({ row, last }: { row: OverallStanding; last: boolean }) {
  const { T, ty } = useTheme();
  const medal = MEDAL_FOR_RANK(row.rank);
  const flags = totalFlags(row.flags);

  return (
    <View style={{ position: 'relative' }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 11, paddingHorizontal: 16,
        backgroundColor: row.isMe ? T.brandTinted : 'transparent',
        opacity: row.eliminated || row.left ? 0.6 : 1,
      }}>
        <View style={{ width: 28, alignItems: 'center' }}>
          {medal
            ? <SF name={medal.icon} size={18} color={medal.color} />
            : <Text style={[ty.footnoteEm, nums, { color: T.labelSecondary }]}>{row.rank}</Text>}
        </View>

        <MemberAvatar name={row.name} avatar={row.avatar} size={34} eliminated={row.eliminated} left={row.left === true} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
            {row.name}{row.isMe ? <Text style={[ty.caption1, { color: T.brand }]}>{`  · ${tr('вы')}`}</Text> : null}
          </Text>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
            {row.teamName || tr('без команды')}
            {/* Вышел по белому флагу и выбыл — разные вещи: первое разрешил
                капитан по уважительной причине, второе человек заработал сам. */}
            {row.left ? ` · 🏳️ ${tr('вышел')}` : row.eliminated ? ` · ${tr('выбыл')}` : ''}
          </Text>
        </View>

        {flags > 0 ? <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {flags}</Capsule> : null}

        <Text style={[ty.subheadEm, { color: row.isMe ? T.brand : T.label }]} numberOfLines={1}>
          {row.points} pts
        </Text>
      </View>
      {!last ? <View style={{ position: 'absolute', bottom: 0, left: 62, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
    </View>
  );
}
