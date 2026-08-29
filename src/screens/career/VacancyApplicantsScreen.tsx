// Vacancy applicants (owner view): list of people who applied, their full
// Talentslab анкета, and controls to accept/reject + leave written feedback.
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, ty } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { fetchApplicants, decideApplication, Applicant, AppStatus } from '../../data/career';
import { resumeRows } from '../../data/talentslab';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'VacancyApplicants'>;

const STATUS_META: Record<AppStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Новый', bg: 'rgba(142,142,147,0.16)', color: '#8E8E93' },
  approved: { label: 'Принят', bg: 'rgba(52,199,89,0.16)', color: '#34C759' },
  rejected: { label: 'Отклонён', bg: 'rgba(255,59,48,0.14)', color: '#FF3B30' },
};

export function VacancyApplicantsScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { T } = useTheme();
  const { getToken } = useAuth();
  const [items, setItems] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Applicant | null>(null);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  // Keep getToken in a ref so `load` (and its effect) don't re-fire on every
  // Clerk re-render — that identity churn could loop and freeze the page.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const load = useCallback(async () => {
    setLoading(true);
    try { const token = await getTokenRef.current(); setItems(await fetchApplicants(jobId, token)); }
    finally { setLoading(false); }
  }, [jobId]);
  useEffect(() => { load(); }, [load]);

  const openApplicant = (a: Applicant) => { setSel(a); setFeedback(a.feedback || ''); };

  const decide = async (status: AppStatus) => {
    if (!sel) return;
    setBusy(true);
    const token = await getToken();
    const ok = await decideApplication(jobId, sel.applicantUserId, { status, feedback: feedback.trim() || undefined }, token);
    setBusy(false);
    if (!ok) { Alert.alert('Ошибка', 'Не удалось сохранить. Попробуйте ещё раз.'); return; }
    setItems((p) => p.map((x) => x.id === sel.id ? { ...x, status, feedback: feedback.trim() } : x));
    setSel(null);
  };

  const saveFeedback = async () => {
    if (!sel) return;
    setBusy(true);
    const token = await getToken();
    const ok = await decideApplication(jobId, sel.applicantUserId, { feedback: feedback.trim() }, token);
    setBusy(false);
    if (!ok) { Alert.alert('Ошибка', 'Не удалось отправить.'); return; }
    setItems((p) => p.map((x) => x.id === sel.id ? { ...x, feedback: feedback.trim() } : x));
    Alert.alert('Отправлено', 'Кандидат увидит вашу обратную связь.');
  };

  const p = sel?.profile ?? null;
  const rows = p?.resume ? resumeRows(p.resume) : [];

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title="Отклики" onBack={() => navigation.goBack()} hairline />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      ) : items.length === 0 ? (
        <EmptyState icon="person.2.fill" title="Пока нет откликов" subtitle="Как только кто-то откликнется, он появится здесь." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: 30 }}>
          <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Откликнулось · {items.length}</Text>
          {items.map((a) => {
            const meta = STATUS_META[a.status];
            const name = a.userName || a.profile?.fullName || (a.userEmail ? a.userEmail.split('@')[0] : 'Кандидат');
            return (
              <Pressable key={a.id} onPress={() => openApplicant(a)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.brand }]}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>
                    {a.profile?.mbtiType ? `${a.profile.mbtiType} · ` : ''}{a.profile?.completeness != null ? `анкета ${a.profile.completeness}%` : (a.userEmail || '')}
                  </Text>
                </View>
                <Capsule bg={meta.bg} color={meta.color}>{meta.label}</Capsule>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Applicant detail */}
      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
          <NavHeader title={sel?.userName || sel?.profile?.fullName || 'Кандидат'} backLabel="Закрыть" onBack={() => setSel(null)} hairline />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {!p ? (
                <View style={{ padding: 20 }}>
                  <Text style={[ty.subhead, { color: T.labelSecondary }]}>Анкета кандидата не найдена в Talentslab{sel?.userEmail ? ` (${sel.userEmail})` : ''}. Возможно, он ещё не заполнил профиль.</Text>
                </View>
              ) : (
                <>
                  <ListSection header="Профиль">
                    <View style={{ padding: 14, gap: 8 }}>
                      {p.fullName ? <Row T={T} k="Имя" v={p.fullName} /> : null}
                      {sel?.userEmail ? <Row T={T} k="Email" v={sel.userEmail} /> : null}
                      {p.phone ? <Row T={T} k="Телефон" v={p.phone} /> : null}
                      {p.currentCity ? <Row T={T} k="Город" v={p.currentCity} /> : null}
                      {p.mbtiType ? <Row T={T} k="MBTI" v={`${p.mbtiType}${p.mbtiName ? ` · ${p.mbtiName}` : ''}`} /> : null}
                      <Row T={T} k="Заполненность" v={`${p.completeness ?? 0}%`} />
                    </View>
                  </ListSection>

                  {p.gallup.length > 0 ? (
                    <ListSection header="Топ таланты Gallup">
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
                        {p.gallup.slice(0, 12).map((g) => (
                          <Capsule key={g.rank} bg={T.fillTertiary} color={T.label}>{g.rank}. {g.name}</Capsule>
                        ))}
                      </View>
                    </ListSection>
                  ) : null}

                  {p.gardner.length > 0 ? (
                    <ListSection header="Множественный интеллект (Гарднер)">
                      <View style={{ padding: 14, gap: 6 }}>
                        {p.gardner.slice().sort((a, b) => b.score - a.score).slice(0, 5).map((g) => (
                          <View key={g.category} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[ty.subhead, { color: T.label }]}>{g.category}</Text>
                            <Text style={[ty.subheadEm, { color: T.brand }]}>{g.score}%</Text>
                          </View>
                        ))}
                      </View>
                    </ListSection>
                  ) : null}

                  {rows.length > 0 ? (
                    <ListSection header="Анкета полностью">
                      <View style={{ padding: 14, gap: 8 }}>
                        {rows.map((r, i) => <Row key={i} T={T} k={r.label} v={r.value} />)}
                      </View>
                    </ListSection>
                  ) : null}
                </>
              )}

              {/* Feedback + decision */}
              <ListSection header="Обратная связь кандидату">
                <View style={{ padding: 14, gap: 10 }}>
                  <TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="Напишите ответ кандидату — он увидит его в приложении…"
                    placeholderTextColor={T.labelTertiary}
                    style={{ backgroundColor: T.fillTertiary, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top', color: T.label, ...ty.body }} />
                  <Pressable onPress={saveFeedback} disabled={busy || !feedback.trim()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: feedback.trim() ? T.brandTinted : T.fillTertiary }}>
                    <Text style={[ty.subheadEm, { color: feedback.trim() ? T.brand : T.labelTertiary }]}>Отправить ответ</Text>
                  </Pressable>
                </View>
              </ListSection>

              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 6 }}>
                <Pressable onPress={() => decide('rejected')} disabled={busy} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,59,48,0.12)' }}>
                  <Text style={[ty.headline, { color: '#FF3B30' }]}>Отклонить</Text>
                </Pressable>
                <Pressable onPress={() => decide('approved')} disabled={busy} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: T.brand }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ty.headline, { color: '#fff' }]}>Принять</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function Row({ T, k, v }: { T: any; k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[ty.subhead, { color: T.labelSecondary, flexShrink: 0, maxWidth: '45%' }]}>{k}</Text>
      <Text style={[ty.subhead, { color: T.label, flex: 1, textAlign: 'right' }]}>{v}</Text>
    </View>
  );
}
