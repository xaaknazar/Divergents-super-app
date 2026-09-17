// Team roster (Состав команды). Every member sees who's on the team — name,
// day, points and a clear red-flag badge — but NOT the anketa. Captains and
// managers (curators/teachers) can tap a member to open the full anketa directly.
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { Screen } from '../../components/Screen';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { MemberAvatar } from '../../components/MemberAvatar';
import { Capsule, ListSection, PrimaryButton } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { tr } from '../../state/LanguageContext';
import { useChallenge } from '../../state/ChallengeContext';
import { useRole } from '../../state/useRole';
import {
  totalFlags, flagsToEliminate, MEDAL_FOR_RANK,
  raiseWhiteFlag, cancelWhiteFlag, whiteFlagErrorText,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeRoster'>;

export function ChallengeRosterScreen({ navigation, route }: Props) {
  const challengeId = route.params?.challengeId ?? '';
  const { T, ty } = useTheme();
  const { userId, getToken } = useAuth();
  const { has } = useRole();
  const { challenge, leaderboard, refresh } = useChallenge();
  const isCaptain = !!challenge.captainId && challenge.captainId === userId;
  const maxFlags = flagsToEliminate(challenge.rules);
  // Анкету участника открывает КАПИТАН своей команды или человек с правом
  // «челленджи». Раньше здесь стоял `canCreate` — общий признак «может
  // создавать контент сообщества». Его даёт и право на поездки, и на спорт, и
  // на каналы: такой человек видел приглашение «нажмите, чтобы открыть
  // анкету», хотя сервер ему отвечал отказом. Кнопка, которая не работает,
  // хуже отсутствующей — и она же намекала, что доступ где-то есть.
  const canSeeAnketa = isCaptain || has('challenges');
  // Белый флаг поднимает капитан своей команде или человек с правом
  // «челленджи». Права те же, что у сервера, — иначе кнопка была бы, а ответ
  // приходил бы отказом.
  const canManageFlags = canSeeAnketa;

  // Кому поднимаем флаг. Причина обязательна и уходит участнику как основание,
  // поэтому нужен ввод текста, а не одно подтверждение.
  const [flagFor, setFlagFor] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submitFlag = async () => {
    if (!flagFor) return;
    const text = reason.trim();
    if (!text) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await raiseWhiteFlag(challengeId, flagFor.id, text, token);
      if (res.ok) {
        setFlagFor(null);
        setReason('');
        await refresh();
        Alert.alert(tr('Белый флаг поднят'), `${flagFor.name} ${tr('получил право выйти из челленджа. Решение остаётся за ним.')}`);
      } else {
        Alert.alert(tr('Не удалось поднять флаг'), tr(whiteFlagErrorText(res.reason)));
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmCancelFlag = (memberId: string, name: string) => {
    Alert.alert(tr('Снять белый флаг?'), `${name} ${tr('продолжит челлендж вместе с командой.')}`, [
      { text: tr('Отмена'), style: 'cancel' },
      {
        text: tr('Снять'),
        onPress: async () => {
          const token = await getToken();
          const res = await cancelWhiteFlag(challengeId, memberId, token);
          if (res.ok) await refresh();
          else Alert.alert(tr('Не удалось снять флаг'), tr(whiteFlagErrorText(res.reason)));
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader backLabel={tr('Челлендж')} onBack={() => navigation.goBack()} />
      <Screen tabPadding={false} topInset={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={[ty.largeTitle, { color: T.label }]} numberOfLines={2}>{tr('Состав команды')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]} numberOfLines={1}>
            {challenge.teamName ? `«${challenge.teamName}» · ` : ''}{pl.count(leaderboard.length, 'участник', 'участника', 'участников')}
          </Text>
          {canSeeAnketa ? (
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 6 }]} numberOfLines={2}>
              {tr('Нажмите на участника, чтобы открыть его анкету')}
            </Text>
          ) : null}
        </View>

        {leaderboard.length === 0 ? (
          <EmptyState icon="person.2.fill" title={tr('Команда ещё формируется')} subtitle={tr('Участники появятся здесь после одобрения заявок.')} />
        ) : (
          <ListSection header={tr('Участники')} footer={`${tr('🚩 — флаги за пропуск дневной нормы (чтение / без сахара / активность).')} ${maxFlags} ${tr('в одной категории → ⛔ вылет. 🏳️ — вышел по белому флагу капитана.')}`}>
            {leaderboard.map((m, i) => {
              const flagN = totalFlags(m.flags);
              const left = m.left === true;
              // Вылет и выход по белому флагу оба выводят из зачёта, но
              // подписываются по-разному: первое — следствие трёх флагов,
              // второе — разрешение капитана по уважительной причине.
              const out = m.eliminated === true || left;
              const medal = MEDAL_FOR_RANK(m.rank);
              // Флаг поднимают ЖИВОМУ участнику своей команды. Себе — нельзя:
              // разрешение самому себе не разрешение, а обход правила.
              const canFlagThis = canManageFlags && !m.isMe && !left && m.eliminated !== true;
              const status = left
                ? ` · ${tr('вышел по белому флагу')}`
                : m.eliminated === true ? ` · ${tr('выбыл')}`
                : m.whiteFlag ? ` · ${tr('белый флаг поднят')}` : '';
              const row = (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: m.isMe ? T.brandTinted : 'transparent', opacity: out ? 0.6 : 1 }}>
                  <MemberAvatar name={m.name} avatar={m.avatar} size={38} eliminated={m.eliminated === true} left={left} />
                  <View style={{ flex: 1 }}>
                    <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>
                      {m.name}{m.isMe ? <Text style={[ty.caption1, { color: T.brand }]}>{`  · ${tr('вы')}`}</Text> : null}
                    </Text>
                    {/* m.day — это БАЛЛЫ ЗА СЕГОДНЯ, а не номер дня: подпись
                        «День 45» читалась как 45-й день челленджа. */}
                    <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]} numberOfLines={1}>
                      {tr('Сегодня')} {m.day} · {tr('всего')} {m.points} pts{status}
                    </Text>
                  </View>
                  {flagN > 0 ? (
                    <Capsule bg="rgba(255,59,48,0.14)" color={T.red}>🚩 {flagN}</Capsule>
                  ) : medal ? <SF name={medal.icon} size={16} color={medal.color} /> : null}
                  {/* Отдельная кнопка, а не пункт в длинном нажатии: капитан
                      должен видеть, что такая возможность есть. Скрытое
                      действие в правилах существует, а на экране — нет. */}
                  {canFlagThis ? (
                    <Pressable
                      onPress={() => (m.whiteFlag ? confirmCancelFlag(m.id, m.name) : setFlagFor({ id: m.id, name: m.name }))}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={m.whiteFlag ? `${tr('Снять белый флаг')} — ${m.name}` : `${tr('Поднять белый флаг')} — ${m.name}`}
                      style={({ pressed }) => ({
                        width: 34, height: 34, borderRadius: 17, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: m.whiteFlag ? T.brandTinted : T.fillTertiary, opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 15 }}>🏳️</Text>
                    </Pressable>
                  ) : null}
                  {canSeeAnketa ? <SF name="chevron.forward" size={13} color={T.labelTertiary} /> : null}
                </View>
              );
              return (
                <View key={m.id} style={{ position: 'relative' }}>
                  {canSeeAnketa
                    ? <Pressable onPress={() => navigation.navigate('ChallengeApplicants', { challengeId, applicantUserId: m.id })} accessibilityRole="button" accessibilityLabel={`${tr('Анкета')} — ${m.name}`}>{row}</Pressable>
                    : row}
                  {i < leaderboard.length - 1 ? <View style={{ position: 'absolute', bottom: 0, left: 66, right: 0, height: 0.5, backgroundColor: T.separator }} /> : null}
                </View>
              );
            })}
          </ListSection>
        )}

        <View style={{ height: 30 }} />
      </Screen>

      {/* Причина — обязательное поле, а не формальность: участник видит её как
          основание, а команда через месяц сможет понять, почему человек ушёл.
          Поэтому отдельный лист с текстом, а не короткое подтверждение. */}
      <Modal visible={!!flagFor} transparent animationType="slide" onRequestClose={() => setFlagFor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Подложка — СОСЕДНИЙ элемент, а не родитель: Pressable вокруг
              содержимого забирает себе жест и ломает ввод. */}
          <Pressable onPress={() => setFlagFor(null)} accessibilityRole="button" accessibilityLabel={tr('Закрыть')}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          <View style={{ backgroundColor: T.groupedBg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderCurve: 'continuous', padding: 20, paddingBottom: 34, gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, borderCurve: 'continuous', backgroundColor: T.fillTertiary }} />
            </View>
            <Text style={[ty.title3, { color: T.label }]}>🏳️ {tr('Белый флаг')}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary }]}>
              {flagFor?.name} {tr('получит право выйти из челленджа досрочно. Выйдет ли — решит сам; его баллы замрут на дне выхода, штрафов за оставшиеся дни не будет.')}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={tr('Причина: болезнь, травма, семейные обстоятельства…')}
              placeholderTextColor={T.labelTertiary}
              multiline
              maxLength={300}
              style={[ty.body, {
                minHeight: 88, backgroundColor: T.cardBg, borderRadius: 12, borderCurve: 'continuous', padding: 12,
                color: T.label, borderWidth: 0.5, borderColor: T.cardBorder, textAlignVertical: 'top',
              }]}
              accessibilityLabel={tr('Причина белого флага')}
            />
            <PrimaryButton
              label={saving ? tr('Отправляем…') : tr('Поднять белый флаг')}
              icon="checkmark"
              disabled={saving || !reason.trim()}
              onPress={submitFlag}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
