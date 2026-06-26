import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton, ty } from '../../components/ui';
import { ErrorState } from '../../components/StateViews';
import {
  fetchChallengesAndTeams, getChallengeMeta, ChallengeListItem, ChallengeTeam,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'JoinChallenge'>;

const NICK_MAX = 9;

export function JoinChallengeScreen({ route, navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const [meta, setMeta] = useState<ChallengeListItem | undefined>(undefined);
  const [teams, setTeams] = useState<ChallengeTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nick, setNick] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [track, setTrack] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    fetchChallengesAndTeams().then(({ challenges, teams: tms, error: err }) => {
      if (!alive) return;
      setMeta(getChallengeMeta(challenges, route.params.challengeId));
      setTeams(tms);
      setError(err);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [route.params.challengeId]);

  useEffect(() => load(), [load]);

  const nickOk = nick.trim().length > 0 && nick.trim().length <= NICK_MAX;
  const canSubmit = nickOk && !!teamId && agree && track;
  const team = teams.find((t) => t.id === teamId);


  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(52,199,89,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <SF name="checkmark.circle.fill" size={56} color={T.green} />
        </View>
        <Text style={[ty.title2, { color: T.label, marginTop: 18, textAlign: 'center' }]}>{tr('Заявка отправлена!')}</Text>
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <Text style={[ty.title3, { color: T.label }]}>{meta?.title}</Text>
        <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 2, marginBottom: 18 }]}>{tr('Старт')} {meta?.startLabel} · {meta?.durationDays} {tr('дней')}</Text>

        {/* Nickname */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{tr('НИКНЕЙМ (до 9 символов, близкий к ФИО)')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardBg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: nick && !nickOk ? T.red : 'transparent' }}>
          <TextInput
            value={nick}
            onChangeText={(t) => setNick(t.slice(0, NICK_MAX))}
            maxLength={NICK_MAX}
            placeholder={tr('напр. Aknazar')}
            placeholderTextColor={T.labelTertiary}
            autoCapitalize="none"
            style={[ty.body, { flex: 1, paddingVertical: 12, color: T.label }]}
          />
          <Text style={[ty.caption1, { color: nickOk || !nick ? T.labelTertiary : T.red }]}>{nick.trim().length}/{NICK_MAX}</Text>
        </View>
        {nick && !nickOk ? <Text style={[ty.caption1, { color: T.red, marginTop: 6, marginLeft: 4 }]}>{tr('Никнейм должен быть от 1 до 9 символов')}</Text> : null}

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
                  <Text style={[ty.body, { color: T.label }]}>{t.name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]}>{t.members}/{t.capacity} · капитан {t.captain}</Text>
                </View>
                <Text style={[ty.caption2Em, { color: full ? T.emeraldText : T.orange }]}>{full ? 'набрана' : `нужно ${t.capacity - t.members}`}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Step / watch tracking consent */}
        <Text style={[ty.footnote, { color: T.labelSecondary, marginTop: 20, marginBottom: 8, marginLeft: 4 }]}>{tr('ОТСЛЕЖИВАНИЕ АКТИВНОСТИ')}</Text>
        <Pressable onPress={() => setTrack((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: track }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 12, padding: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="figure.walk" size={20} color={T.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ty.subheadEm, { color: T.label }]}>{tr('Разрешить отслеживание шагов')}</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 1 }]}>{tr('Приложение будет считать шаги и, при наличии, подключится к вашим часам (Apple Watch / Google Fit) для авто-учёта активности.')}</Text>
          </View>
          <SF name={track ? 'checkmark.circle.fill' : 'circle'} size={24} color={track ? T.brand : T.labelTertiary} />
        </Pressable>

        {/* Agree */}
        <Pressable onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} accessibilityLabel="Согласен с правилами" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 }}>
          <SF name={agree ? 'checkmark.circle.fill' : 'circle'} size={24} color={agree ? T.brand : T.labelTertiary} />
          <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>{tr('Я ознакомился с правилами: 20 страниц, без сахара, 10 000 шагов и отчёт до 23:00. 3 🚩 — вылет.')}</Text>
        </Pressable>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Отправить заявку')} icon="paperplane.fill" color={canSubmit ? T.brand : T.labelTertiary} onPress={() => canSubmit && setSubmitted(true)} />
      </View>
    </View>
  );
}
