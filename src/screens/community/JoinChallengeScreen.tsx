import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton } from '../../components/ui';
import { ErrorState } from '../../components/StateViews';
import {
  fetchChallengesAndTeams, getChallengeMeta, ChallengeListItem, ChallengeTeam, CHALLENGE_RULES,
} from '../../data/community';
import { applyToChallenge, challengeApplyFailureMessage } from '../../data/api';
import { useTalentProfile } from '../../state/useTalentProfile';
import { useResumeAccess } from '../../state/useResumeAccess';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'JoinChallenge'>;

// Псевдоним для рейтинга берётся из анкеты профиля (User.nickname) — именно его
// сервер показывает команде. Отдельное поле «никнейм» здесь раньше валидировали
// и никуда не отправляли, поэтому его больше нет.
function profileNickname(profile: unknown): string {
  const resume = (profile as { resume?: Record<string, unknown> } | null)?.resume;
  const value = resume?.nickname;
  return typeof value === 'string' ? value.trim() : '';
}

export function JoinChallengeScreen({ route, navigation }: Props) {
  const { T, ty } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const [meta, setMeta] = useState<ChallengeListItem | undefined>(undefined);
  const [teams, setTeams] = useState<ChallengeTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tg, setTg] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [track, setTrack] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { getToken } = useAuth();
  // The applicant's own анкета — attached to the application so the captain/admin
  // reliably sees it (independent of the server→Talentslab by-email lookup).
  const { profile, live } = useTalentProfile();
  const { require: requireResume } = useResumeAccess();

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    fetchChallengesAndTeams().then(({ challenges, error: err }) => {
      if (!alive) return;
      const m = getChallengeMeta(challenges, route.params.challengeId);
      setMeta(m);
      // Teams MUST be scoped to the challenge being applied to — not the global
      // "first open challenge" list — so the selected teamId belongs to it.
      setTeams(m?.teamList ?? []);
      setError(err);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [route.params.challengeId]);

  useEffect(() => load(), [load]);

  const nick = profileNickname(profile);
  const tgHandle = tg.trim().replace(/^@+/, '');
  const tgOk = tgHandle.length >= 3;
  const canSubmit = tgOk && !!teamId && agree && track;
  const team = teams.find((t) => t.id === teamId);
  // Подсказка под кнопкой: что именно ещё не заполнено.
  const missing = [
    !tgOk ? tr('укажите Telegram') : '',
    !teamId ? tr('выберите команду') : '',
    !track ? tr('разрешите запись тренировок') : '',
    !agree ? tr('подтвердите правила') : '',
  ].filter(Boolean);
  const missingHint = missing.length ? missing.join(', ').replace(/^./, (ch) => ch.toUpperCase()) : '';

  // Real submit: send the application to the server; only show success when the
  // server actually accepted it. Отказ показываем настоящей причиной — «заявка
  // уже на рассмотрении» или «в команде нет мест», а не «проверьте подключение».
  const submit = async () => {
    if (!canSubmit || submitting) return;
    // Капитан команды видит анкету заявителя: пустая карточка не даёт ему
    // ничего решить, поэтому разделы анкеты обязательны до отправки.
    if (!requireResume('community')) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const r = await applyToChallenge(token, route.params.challengeId, teamId, live ? profile : undefined, tgHandle);
      if (r.ok) {
        setSubmitted(true);
      } else {
        const { title, body } = challengeApplyFailureMessage(r);
        Alert.alert(tr(title), tr(body));
        // Место в команде заняли, пока заполнялась заявка — покажем свежие цифры.
        if (r.reason === 'team_full') { setTeamId(null); load(); }
      }
    } catch {
      Alert.alert(tr('Не удалось отправить заявку'), tr('Проверьте подключение и попробуйте снова.'));
    } finally {
      setSubmitting(false);
    }
  };


  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(52,199,89,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <SF name="checkmark.circle.fill" size={56} color={T.green} />
        </View>
        <Text style={[ty.title2, { color: T.label, marginTop: 18, textAlign: 'center' }]} numberOfLines={1}>{tr('Заявка отправлена!')}</Text>
        <Text style={[ty.body, { color: T.labelSecondary, marginTop: 8, textAlign: 'center' }]}>
          Капитан команды «{team?.name}» рассмотрит вашу заявку на «{meta?.title}». С вами свяжутся в Telegram перед стартом {meta?.startLabel}.
        </Text>
        <PrimaryButton label={tr('Готово')} style={{ marginTop: 24, alignSelf: 'stretch' }} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={tr('Заявка')} backLabel={tr('Отмена')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 130 }} keyboardShouldPersistTaps="handled">
        <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{meta?.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2, marginBottom: 18 }]} numberOfLines={1}>{tr('Старт')} {meta?.startLabel} · {pl.days(meta?.durationDays ?? 0)}</Text>

        {/* Псевдоним — только для сведения: он берётся из анкеты профиля, и
            именно его команда видит в рейтинге. Отдельного поля здесь нет. */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('ПСЕВДОНИМ В РЕЙТИНГЕ')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 12, padding: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: nick ? T.brand : T.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
            {nick
              ? <Text style={[ty.subheadEm, { color: '#fff' }]}>{nick.charAt(0).toUpperCase()}</Text>
              : <SF name="person.fill" size={18} color={T.labelTertiary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.subheadEm, { color: nick ? T.label : T.labelSecondary }]} numberOfLines={1}>
              {nick || tr('Псевдоним не указан')}
            </Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>
              {nick
                ? tr('Так вас увидят в составе и рейтинге команды.')
                : tr('Пока в рейтинге будет ваше имя. Псевдоним задаётся в анкете профиля.')}
            </Text>
          </View>
        </View>

        {/* Telegram username — how the captain reaches you */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 20, marginBottom: 6, marginLeft: 4 }]}>{tr('USERNAME В TELEGRAM')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardBg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: tg && !tgOk ? T.red : 'transparent' }}>
          <Text style={[ty.body, { color: T.labelSecondary }]}>@</Text>
          <TextInput
            value={tg}
            onChangeText={(t) => setTg(t.replace(/[^a-zA-Z0-9_@]/g, ''))}
            placeholder={tr('username')}
            placeholderTextColor={T.labelTertiary}
            autoCapitalize="none" autoCorrect={false} returnKeyType="done"
            keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
            accessibilityLabel={tr('Username в Telegram')}
            style={[ty.body, { flex: 1, paddingVertical: 12, color: T.label }]}
          />
        </View>
        {tg && !tgOk ? (
          <Text style={[ty.caption1, { color: T.redText, marginTop: 6, marginLeft: 4 }]} accessibilityLiveRegion="polite">{tr('Минимум 3 символа: латиница, цифры и «_».')}</Text>
        ) : (
          <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>{tr('Капитан свяжется с вами в Telegram и добавит в чат команды.')}</Text>
        )}

        {/* Team */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 20, marginBottom: 6, marginLeft: 4 }]}>{tr('ВЫБЕРИТЕ КОМАНДУ')}</Text>
        <View style={{ backgroundColor: T.cardBg, borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color={T.brand} /></View>
          ) : error && teams.length === 0 ? (
            <View style={{ paddingVertical: 12 }}><ErrorState onRetry={load} /></View>
          ) : teams.length === 0 ? (
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>{tr('Команды пока не сформированы.')}</Text>
            </View>
          ) : teams.map((t, i) => {
            const full = t.members >= t.capacity;
            const sel = teamId === t.id;
            return (
              <Pressable key={t.id} disabled={full} onPress={() => setTeamId(t.id)}
                accessibilityRole="button" accessibilityState={{ selected: sel, disabled: full }} accessibilityLabel={`Команда ${t.name}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, opacity: full ? 0.45 : 1, backgroundColor: sel ? T.brandTinted : 'transparent', borderBottomWidth: i < teams.length - 1 ? 0.5 : 0, borderBottomColor: T.separator }}>
                <SF name={sel ? 'checkmark.circle.fill' : 'circle'} size={22} color={sel ? T.brand : T.labelTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{t.members}/{t.capacity} · капитан {t.captain}</Text>
                </View>
                <Text style={[ty.caption2Em, { color: full ? T.emeraldText : T.orange }]} numberOfLines={1}>{full ? 'набрана' : `нужно ${t.capacity - t.members}`}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Activity tracking consent — describes what the app actually does:
            GPS-запись бега/ходьбы внутри приложения + ручной ввод. Шагомера и
            интеграции с часами нет, поэтому их не обещаем. */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 20, marginBottom: 8, marginLeft: 4 }]}>{tr('ОТСЛЕЖИВАНИЕ АКТИВНОСТИ')}</Text>
        <Pressable onPress={() => setTrack((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: track }}
          accessibilityLabel={tr('Разрешить запись тренировок по GPS')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 12, padding: 14, minHeight: 48 }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="figure.walk" size={20} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.subheadEm, { color: T.label }]} numberOfLines={2}>{tr('Разрешить запись тренировок по GPS')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{tr('Бег и ходьбу можно записывать в приложении по геолокации — дистанция пересчитывается в шаги. Остальную активность вы вносите вручную; часы и шагомер не подключаются.')}</Text>
          </View>
          <SF name={track ? 'checkmark.circle.fill' : 'circle'} size={24} color={track ? T.brand : T.labelTertiary} />
        </Pressable>

        {/* Rules — open/hide, then the mandatory acknowledgment */}
        <Pressable onPress={() => setShowRules((v) => !v)} accessibilityRole="button" accessibilityLabel={tr('Правила челленджа')} accessibilityState={{ expanded: showRules }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 14, marginBottom: showRules ? 4 : 0 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, marginLeft: 4 }]}>{tr('ПРАВИЛА ЧЕЛЛЕНДЖА')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[ty.caption1, { color: T.brand }]}>{showRules ? tr('Скрыть') : tr('Открыть')}</Text>
            <SF name={showRules ? 'chevron.down' : 'chevron.right'} size={12} color={T.brand} />
          </View>
        </Pressable>
        {showRules ? (
          <View style={{ backgroundColor: T.cardBg, borderRadius: 12, padding: 14, gap: 9 }}>
            {CHALLENGE_RULES.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={[ty.subheadEm, { color: T.brand, width: 16 }]}>{i + 1}</Text>
                <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Mandatory acknowledgment */}
        <Pressable onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} accessibilityLabel="Ознакомился с правилами" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, minHeight: 44 }}>
          <SF name={agree ? 'checkmark.circle.fill' : 'circle'} size={24} color={agree ? T.brand : T.labelTertiary} />
          <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{tr('Я прочитал(а) и ознакомился с правилами челленджа выше и согласен(на) их соблюдать.')}</Text>
        </Pressable>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Отправить заявку')} icon="paperplane.fill" loading={submitting} disabled={!canSubmit} onPress={submit} />
        {missingHint ? (
          <Text style={[ty.caption1, { color: T.labelSecondary, textAlign: 'center', marginTop: 8 }]} numberOfLines={2}>{missingHint}</Text>
        ) : null}
      </View>
    </View>
  );
}
