import { FieldValueRow } from '../../components/FieldValueRow';
import { ApplicationStatusBadge, applicationStatusLabel } from '../../components/ApplicationStatusBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { Wrapper } from '../../components/Wrapper';
// Challenge applicants — admin sees everyone, a team captain sees only their
// team. Shows each candidate's full Talentslab анкета, and lets the reviewer
// accept/reject with a reason. Admins can also promote an applicant to captain
// of their team. Mirrors VacancyApplicantsScreen.
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { ListSection } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import {
  fetchChallengeApplicants, decideChallengeApplication, assignTeamCaptain,
  ChallengeApplicant, ChallengeAppStatus,
} from '../../data/community';
import { resumeRows } from '../../data/talentslab';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ChallengeApplicants'>;

const STATUS_LABEL: Record<ChallengeAppStatus, string> = { pending: 'Новый', approved: 'Принят', rejected: 'Отклонён' };


export function ChallengeApplicantsScreen({ route, navigation }: Props) {
  // Разбор с запасом: уведомление могло прийти без параметров, и падение
  // экрана выглядело как вылет из приложения.
  const challengeId = route.params?.challengeId ?? '';
  const applicantUserId = route.params?.applicantUserId;
  const directProfile = !!applicantUserId;
  const { T, ty } = useTheme();
  const { getToken } = useAuth();
  const [items, setItems] = useState<ChallengeApplicant[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<ChallengeApplicant | null>(null);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setCanReview(false);
    try {
      const token = await getTokenRef.current();
      // Для одного человека передаём его id: сервер тогда подтянет анкету
      // живьём из Talentslab, а не снимок на момент подачи заявки.
      const { applicants, canManage: cm, canReviewApplications, ok } = await fetchChallengeApplicants(challengeId, token, applicantUserId);
      // Неудачный запрос — это ошибка с кнопкой «повторить», а не «анкета
      // недоступна»: второе означает, что человека нет, и уводит не туда.
      if (!ok) { setError(true); return; }
      setItems(applicants); setCanManage(cm); setCanReview(canReviewApplications === true);
      if (applicantUserId) {
        const selected = applicants.find((a) => a.applicantUserId === applicantUserId);
        if (selected) {
          setSel(selected);
          setFeedback(selected.feedback || '');
        }
      }
    } catch {
      // Сеть/токен упали — показываем состояние ошибки с повтором, а не пустой список.
      setError(true);
    } finally { setLoading(false); }
  }, [applicantUserId, challengeId]);
  useEffect(() => { load(); }, [load]);

  const openApplicant = (a: ChallengeApplicant) => { setSel(a); setFeedback(a.feedback || ''); };
  const closeApplicant = () => {
    if (directProfile) navigation.goBack();
    else setSel(null);
  };

  // Отклонение — необратимое для кандидата действие: подтверждаем отдельно.
  const confirmReject = () => {
    if (!sel || !canReview || directProfile || sel.isCaptain || busy) return;
    const name = sel.userName || 'Участник';
    Alert.alert('Отклонить заявку?', `${name} получит отказ${feedback.trim() ? ' и ваш комментарий' : ''}. Подать заявку заново можно будет позже.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: () => decide('rejected') },
    ]);
  };

  const decide = async (status: ChallengeAppStatus) => {
    if (!sel || !canReview || directProfile || sel.isCaptain || busy) return;
    setBusy(true);
    const token = await getToken();
    const ok = await decideChallengeApplication(challengeId, sel.applicantUserId, { status, feedback: feedback.trim() || undefined }, token);
    setBusy(false);
    if (!ok) { void load(); Alert.alert('Решение не сохранено', 'Проверьте соединение. Если челлендж уже начался, менять состав нельзя. Обновляем доступность действий.'); return; }
    hSuccess();
    setItems((p) => p.map((x) => x.id === sel.id ? { ...x, status, feedback: feedback.trim() } : x));
    if (directProfile) navigation.goBack();
    else setSel(null);
  };

  const saveFeedback = async () => {
    if (!sel || !canReview || directProfile || sel.isCaptain || busy) return;
    setBusy(true);
    const token = await getToken();
    const ok = await decideChallengeApplication(challengeId, sel.applicantUserId, { feedback: feedback.trim() }, token);
    setBusy(false);
    if (!ok) { Alert.alert('Ошибка', 'Не удалось отправить.'); return; }
    setItems((p) => p.map((x) => x.id === sel.id ? { ...x, feedback: feedback.trim() } : x));
    Alert.alert('Отправлено', 'Кандидат увидит вашу обратную связь.');
  };

  const makeCaptain = async () => {
    if (!sel || !sel.teamId || !canReview || !canManage || busy) return;
    Alert.alert('Назначить капитаном?', `${sel.userName || 'Кандидат'} станет капитаном команды «${sel.teamName}» и сможет принимать заявки в неё.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Назначить', onPress: async () => {
        setBusy(true);
        const token = await getToken();
        const ok = await assignTeamCaptain(challengeId, sel.teamId!, sel.applicantUserId, token);
        setBusy(false);
        if (ok) {
          hSuccess();
          // Без перезагрузки экран (и страница челленджа) показывали прежнего
          // капитана до перезапуска приложения.
          load();
          Alert.alert('Готово', `Капитан команды «${sel.teamName}» назначен.`);
        }
        else Alert.alert('Ошибка', 'Не удалось назначить капитана.');
      } },
    ]);
  };

  const p = sel?.profile ?? null;
  const rows = p?.resume ? resumeRows(p.resume) : [];

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title={directProfile ? 'Анкета участника' : 'Заявки'} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : directProfile ? (
        <EmptyState icon="person.crop.circle.badge.exclamationmark" title="Анкета недоступна" subtitle="Не удалось найти анкету этого участника." />
      ) : !canReview ? (
        <EmptyState icon="lock.fill" title="Приём заявок закрыт" subtitle="После начала челленджа состав зафиксирован. Анкеты участников доступны через состав вашей команды." />
      ) : items.length === 0 ? (
        <EmptyState icon="person.2.fill" title="Пока нет заявок" subtitle="Как только кто-то подаст заявку, она появится здесь." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: 30 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Заявок · {items.length}</Text>
          {items.map((a) => {

            // В списке — псевдоним (его отдаёт сервер). ФИО и почта тут не
            // показываются: капитан ещё ничего не решил, а это личные данные.
            // Настоящее имя видно в анкете, когда он откроет заявку.
            const name = a.userName || 'Участник';
            return (
              <Pressable key={a.id} onPress={() => openApplicant(a)}
                accessibilityRole="button" accessibilityLabel={`${name}${a.teamName ? `, ${a.teamName}` : ''}, ${applicationStatusLabel(a.status)}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.cardBorder, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.brand }]}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>
                    {a.teamName ? `${a.teamName} · ` : ''}{a.profile?.completeness != null ? `анкета ${a.profile.completeness}%` : a.source === 'site' ? 'с сайта' : ''}
                  </Text>
                </View>
                {a.isCaptain
                  ? <StatusBadge label={String("капитан")} tone="brand" />
                  : <ApplicationStatusBadge status={a.status} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Applicant detail */}
      <Modal visible={!!sel} animationType={directProfile ? "none" : "slide"} onRequestClose={closeApplicant}>
        <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
          <NavHeader title={sel?.userName || 'Участник'} backLabel={directProfile ? "Состав" : "Закрыть"} onBack={closeApplicant} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {!directProfile ? (
                <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Заявка">
                  <View style={{ padding: 14, gap: 8 }}>
                    {sel?.teamName ? <FieldValueRow label="Команда" value={sel.teamName} /> : null}
                    <FieldValueRow label="Статус" value={sel ? STATUS_LABEL[sel.status] : ''} />
                    {sel?.telegram ? (
                      <Pressable onPress={() => Linking.openURL(`https://t.me/${sel.telegram}`).catch(() => {})} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <Text style={[ty.subhead, { color: T.labelSecondary }]}>Telegram</Text>
                        <Text style={[ty.subhead, { color: T.brand }]} numberOfLines={1}>@{sel.telegram}</Text>
                      </Pressable>
                    ) : null}
                    {sel && sel.coefficient !== 1 ? <FieldValueRow label="Коэффициент" value={`×${sel.coefficient}`} /> : null}
                  </View>
                </ListSection></Wrapper>
              ) : null}

              {!p ? (
                <View style={{ padding: 20, gap: 6 }}>
                  {/* Заявка с сайта анкеты не содержит по устройству: там её не
                      просят. Писать «не найдена» — вводить капитана в
                      заблуждение, будто что-то сломалось. */}
                  <Text style={[ty.subhead, { color: T.label }]}>
                    {sel?.profileStatus === 'unavailable'
                      ? 'Не удалось загрузить анкету. Обновите экран или попробуйте позже — это не означает, что участник её не заполнил.'
                      : 'Анкета пока не получена. Участнику нужно открыть приложение и синхронизировать сохранённую анкету.'}
                  </Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]}>
                    {sel?.fullName ? `${sel.fullName}. ` : ''}{sel?.userEmail ?? ''}
                  </Text>
                </View>
              ) : (
                <>
                  <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Профиль">
                    <View style={{ padding: 14, gap: 8 }}>
                      {p.fullName || sel?.fullName ? <FieldValueRow label="Имя" value={p.fullName || sel!.fullName} /> : null}
                      {sel?.userEmail ? <FieldValueRow label="Email" value={sel.userEmail} /> : null}
                      {p.phone ? <FieldValueRow label="Телефон" value={p.phone} /> : null}
                      {p.currentCity ? <FieldValueRow label="Город" value={p.currentCity} /> : null}
                      {p.mbtiType ? <FieldValueRow label="MBTI" value={`${p.mbtiType}${p.mbtiName ? ` · ${p.mbtiName}` : ''}`} /> : null}
                      <FieldValueRow label="Заполненность" value={`${p.completeness ?? 0}%`} />
                    </View>
                  </ListSection></Wrapper>

                  {p.gallup.length > 0 ? (
                    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Топ таланты Gallup">
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
                        {p.gallup.slice(0, 12).map((g) => (
                          <StatusBadge key={g.rank} label={[(g.rank), ". ", (g.name)].join('')} tone="neutral" />
                        ))}
                      </View>
                    </ListSection></Wrapper>
                  ) : null}

                  {p.gardner.length > 0 ? (
                    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Множественный интеллект (Гарднер)">
                      <View style={{ padding: 14, gap: 6 }}>
                        {p.gardner.slice().sort((a, b) => b.score - a.score).slice(0, 5).map((g) => (
                          <View key={g.category} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[ty.subhead, { color: T.label }]}>{g.category}</Text>
                            <Text style={[ty.subheadEm, { color: T.brand }]}>{g.score}%</Text>
                          </View>
                        ))}
                      </View>
                    </ListSection></Wrapper>
                  ) : null}

                  {rows.length > 0 ? (
                    <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Анкета полностью">
                      <View style={{ padding: 14, gap: 8 }}>
                        {rows.map((r, i) => <FieldValueRow key={i} label={r.label} value={r.value} />)}
                      </View>
                    </ListSection></Wrapper>
                  ) : null}
                </>
              )}

              {/* Капитану решения не выносят: его строка — членство в своей
                  команде, а не заявка. Принимать нечего, а «отклонить» снесло
                  бы капитана из его же команды. */}
              {canReview && !directProfile && !sel?.isCaptain ? (
                <>
                  <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Ответ кандидату (причина)">
                    <View style={{ padding: 14, gap: 10 }}>
                      <TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="Напишите причину приёма/отклонения — кандидат увидит её…"
                        placeholderTextColor={T.labelTertiary}
                        style={{ backgroundColor: T.fillTertiary, borderRadius: 12, borderCurve: 'continuous', padding: 12, minHeight: 90, textAlignVertical: 'top', color: T.label, ...ty.body }} />
                      <Pressable onPress={saveFeedback} disabled={busy || !feedback.trim()}
                        accessibilityRole="button" accessibilityLabel="Отправить ответ" accessibilityState={{ disabled: busy || !feedback.trim() }}
                        style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderCurve: 'continuous', backgroundColor: feedback.trim() ? T.brandTinted : T.fillTertiary }}>
                        <Text style={[ty.subheadEm, { color: feedback.trim() ? T.brand : T.labelTertiary }]}>Отправить ответ</Text>
                      </Pressable>
                    </View>
                  </ListSection></Wrapper>

                  {canManage && sel?.teamId ? (
                    <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                      <Pressable onPress={makeCaptain} disabled={busy} accessibilityRole="button" accessibilityLabel={`Назначить капитаном «${sel.teamName}»`}
                        style={{ minHeight: 48, paddingVertical: 12, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, backgroundColor: T.brandTinted }}>
                        <SF name="star.fill" size={15} color={T.brand} />
                        <Text style={[ty.subheadEm, { color: T.brand }]}>Назначить капитаном «{sel.teamName}»</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
                    <Pressable onPress={confirmReject} disabled={busy} accessibilityRole="button" accessibilityLabel="Отклонить заявку" accessibilityState={{ disabled: busy }}
                      style={{ flex: 1, minHeight: 48, paddingVertical: 14, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', backgroundColor: 'rgba(255,59,48,0.12)' }}>
                      <Text style={[ty.headline, { color: T.redText }]}>Отклонить</Text>
                    </Pressable>
                    <Pressable onPress={() => decide('approved')} disabled={busy} accessibilityRole="button" accessibilityLabel="Принять заявку" accessibilityState={{ disabled: busy, busy }}
                      style={{ flex: 1, minHeight: 48, paddingVertical: 14, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', backgroundColor: T.brand }}>
                      {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]}>Принять</Text>}
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
