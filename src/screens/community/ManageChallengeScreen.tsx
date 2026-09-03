// Creator's control room for a challenge — available only BEFORE it starts.
// Rename the challenge, rename teams, change each team's size and captain, move
// participants between teams and remove them. Once the challenge starts the
// whole screen becomes read-only (server enforces the same rule).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert,
  ActionSheetIOS, Platform, KeyboardAvoidingView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection } from '../../components/ui';
import { EmptyState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import {
  fetchChallengeManage, updateChallenge, updateChallengeTeam,
  moveChallengeParticipant, removeChallengeParticipant,
  ChallengeManage, ManageTeam, ManageMember,
} from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParams, 'ManageChallenge'>;

// Cross-platform action sheet: native sheet on iOS, an Alert with buttons on Android.
function showSheet(
  opts: { title?: string; message?: string; options: string[]; cancelIndex: number; destructiveIndex?: number },
  onPick: (i: number) => void,
) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: opts.title, message: opts.message, options: opts.options, cancelButtonIndex: opts.cancelIndex, destructiveButtonIndex: opts.destructiveIndex },
      onPick,
    );
  } else {
    const buttons = opts.options.map((label, i) => ({
      text: label,
      style: (i === opts.cancelIndex ? 'cancel' : i === opts.destructiveIndex ? 'destructive' : 'default') as any,
      onPress: () => onPick(i),
    }));
    Alert.alert(opts.title ?? '', opts.message, buttons);
  }
}

export function ManageChallengeScreen({ route, navigation }: Props) {
  const { challengeId } = route.params;
  const { T, ty } = useTheme();
  const { getToken } = useAuth();

  const [manage, setManage] = useState<ChallengeManage | null>(null);
  const [loading, setLoading] = useState(true);
  // Editable working copies.
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('21');
  const [price, setPrice] = useState('');
  const [teams, setTeams] = useState<ManageTeam[]>([]);
  const [members, setMembers] = useState<ManageMember[]>([]);
  const [savingCh, setSavingCh] = useState(false);
  // Controlled team-name drafts + a short «Сохранено» / «Не сохранено» note per team.
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [teamNote, setTeamNote] = useState<Record<string, 'saved' | 'error' | undefined>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Capacity taps are coalesced: one request 500 ms after the last tap.
  const capTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const committedCap = useRef<Record<string, number>>({});
  const teamsRef = useRef<ManageTeam[]>([]);
  teamsRef.current = teams;

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const load = useCallback(async () => {
    const token = await getTokenRef.current();
    const d = await fetchChallengeManage(challengeId, token);
    setManage(d);
    if (d) {
      setTitle(d.challenge.title);
      setDays(String(d.challenge.durationDays));
      setPrice(d.challenge.price ?? '');
      setTeams(d.teams);
      setTeamNames(Object.fromEntries(d.teams.map((t) => [t.id, t.name])));
      committedCap.current = Object.fromEntries(d.teams.map((t) => [t.id, t.capacity]));
      setMembers(d.members);
    }
    setLoading(false);
  }, [challengeId]);

  useEffect(() => () => {
    Object.values(noteTimers.current).forEach(clearTimeout);
    Object.values(capTimers.current).forEach(clearTimeout);
  }, []);

  const flashNote = (teamId: string, note: 'saved' | 'error') => {
    setTeamNote((p) => ({ ...p, [teamId]: note }));
    clearTimeout(noteTimers.current[teamId]);
    noteTimers.current[teamId] = setTimeout(() => setTeamNote((p) => ({ ...p, [teamId]: undefined })), note === 'saved' ? 2000 : 4000);
  };
  // Fires on mount and whenever the screen refocuses (e.g. back from «Заявки»),
  // so a just-accepted applicant shows up in the roster.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const editable = manage?.challenge.editable ?? false;
  const locked = !!manage && !editable;

  // Roster count is derived from the members list so it stays correct after moves.
  const countFor = useCallback((teamId: string) => members.filter((m) => m.teamId === teamId).length, [members]);

  const reloadWithNotice = async (msg: string) => { Alert.alert('Челлендж уже идёт', msg); await load(); };

  // ── Challenge-level save ─────────────────────────────────────────────
  const chDirty = useMemo(() => {
    if (!manage) return false;
    const priceVal = price.trim() || null;
    return (
      (title.trim() && title.trim() !== manage.challenge.title) ||
      (Number(days) >= 14 && Number(days) !== manage.challenge.durationDays) ||
      priceVal !== (manage.challenge.price ?? null)
    ) as boolean;
  }, [manage, title, days, price]);

  const saveChallenge = async () => {
    if (!manage || !chDirty) return;
    const patch: { title?: string; durationDays?: number; price?: string | null } = {};
    if (title.trim() && title.trim() !== manage.challenge.title) patch.title = title.trim();
    if (Number(days) >= 14 && Number(days) !== manage.challenge.durationDays) patch.durationDays = Number(days);
    const priceVal = price.trim() || null;
    if (priceVal !== (manage.challenge.price ?? null)) patch.price = priceVal;
    setSavingCh(true);
    const token = await getToken();
    const r = await updateChallenge(challengeId, patch, token);
    setSavingCh(false);
    if (r.ok) { hSuccess(); load(); }
    else if (r.reason === 'started') reloadWithNotice('Название и параметры менять уже нельзя.');
    else Alert.alert('Не удалось сохранить', 'Проверьте подключение и попробуйте снова.');
  };

  // ── Team edits ───────────────────────────────────────────────────────
  const patchTeam = async (team: ManageTeam, patch: { name?: string; capacity?: number; captain?: string | null }, optimistic: Partial<ManageTeam>) => {
    setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...optimistic } : t)));
    const token = await getToken();
    const r = await updateChallengeTeam(challengeId, team.id, patch, token);
    if (r.ok) { hSuccess(); if (patch.captain !== undefined) load(); }
    else if (r.reason === 'started') reloadWithNotice('Команды менять уже нельзя.');
    else { Alert.alert('Не удалось сохранить', 'Попробуйте ещё раз.'); load(); }
  };

  const saveTeamName = async (team: ManageTeam) => {
    const nm = (teamNames[team.id] ?? '').trim();
    if (!nm || nm === team.name) {
      // Пустое имя не сохраняем — возвращаем последнее сохранённое.
      setTeamNames((p) => ({ ...p, [team.id]: team.name }));
      return;
    }
    const token = await getToken();
    const r = await updateChallengeTeam(challengeId, team.id, { name: nm }, token);
    if (r.ok) {
      hSuccess();
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name: nm } : t)));
      flashNote(team.id, 'saved');
      return;
    }
    // Ошибка → откатываем поле к последнему сохранённому значению.
    setTeamNames((p) => ({ ...p, [team.id]: team.name }));
    if (r.reason === 'started') reloadWithNotice('Команды менять уже нельзя.');
    else flashNote(team.id, 'error');
  };

  const commitCapacity = (teamId: string) => {
    delete capTimers.current[teamId];
    const latest = teamsRef.current.find((t) => t.id === teamId);
    if (!latest || latest.capacity === committedCap.current[teamId]) return;
    committedCap.current[teamId] = latest.capacity;
    patchTeam(latest, { capacity: latest.capacity }, {});
  };

  const changeCapacity = (team: ManageTeam, delta: number) => {
    const min = Math.max(1, countFor(team.id));
    const next = Math.max(min, team.capacity + delta);
    if (next === team.capacity) {
      if (delta < 0) Alert.alert('Нельзя меньше', `В команде уже ${countFor(team.id)} участник(ов).`);
      return;
    }
    // Оптимистично сразу, запрос — один после паузы в нажатиях.
    setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, capacity: next } : t)));
    clearTimeout(capTimers.current[team.id]);
    capTimers.current[team.id] = setTimeout(() => commitCapacity(team.id), 500);
  };

  const pickCaptain = (team: ManageTeam) => {
    if (locked) return;
    const roster = members.filter((m) => m.teamId === team.id);
    if (roster.length === 0) { Alert.alert('Нет участников', 'Сначала добавьте участников в команду.'); return; }
    const names = roster.map((m) => m.userName || m.userEmail || 'Участник');
    const options = [...names, ...(team.captainId ? ['Снять капитана'] : []), 'Отмена'];
    const cancelIndex = options.length - 1;
    const removeIndex = team.captainId ? cancelIndex - 1 : -1;
    showSheet({ title: `Капитан «${team.name}»`, options, cancelIndex, destructiveIndex: removeIndex >= 0 ? removeIndex : undefined }, (i) => {
      if (i === cancelIndex) return;
      if (i === removeIndex) { patchTeam(team, { captain: null }, { captainId: null, captainName: null }); return; }
      const m = roster[i];
      if (m) patchTeam(team, { captain: m.userId }, { captainId: m.userId, captainName: m.userName || m.userEmail });
    });
  };

  // ── Participant move / remove ────────────────────────────────────────
  const memberMenu = (m: ManageMember) => {
    if (locked) return;
    const name = m.userName || m.userEmail || 'Участник';
    showSheet({ title: name, options: ['Переместить в другую команду', 'Удалить из челленджа', 'Отмена'], cancelIndex: 2, destructiveIndex: 1 }, (i) => {
      if (i === 0) moveMenu(m);
      else if (i === 1) confirmRemove(m);
    });
  };

  const moveMenu = (m: ManageMember) => {
    const targets = teams.filter((t) => t.id !== m.teamId);
    if (targets.length === 0) { Alert.alert('Некуда переместить', 'В челлендже только одна команда.'); return; }
    const options = [...targets.map((t) => `${t.name} · ${countFor(t.id)}/${t.capacity}`), 'Отмена'];
    const cancelIndex = options.length - 1;
    showSheet({ title: 'Переместить в команду', options, cancelIndex }, async (i) => {
      if (i === cancelIndex) return;
      const target = targets[i];
      if (!target) return;
      if (countFor(target.id) >= target.capacity) { Alert.alert('Команда заполнена', `«${target.name}» уже набрала ${target.capacity}. Увеличьте размер команды.`); return; }
      const token = await getToken();
      const r = await moveChallengeParticipant(challengeId, m.userId, target.id, token);
      if (r.ok) { hSuccess(); setMembers((prev) => prev.map((x) => (x.userId === m.userId ? { ...x, teamId: target.id } : x))); }
      else if (r.reason === 'started') reloadWithNotice('Перемещать участников уже нельзя.');
      else Alert.alert('Не удалось переместить', 'Попробуйте ещё раз.');
    });
  };

  const confirmRemove = (m: ManageMember) => {
    const name = m.userName || m.userEmail || 'участника';
    Alert.alert('Удалить из челленджа?', `${name} будет удалён(а) из челленджа. Он(а) сможет подать заявку заново.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        const token = await getToken();
        const r = await removeChallengeParticipant(challengeId, m.userId, token);
        if (r.ok) { hSuccess(); setMembers((prev) => prev.filter((x) => x.userId !== m.userId)); }
        else if (r.reason === 'started') reloadWithNotice('Удалять участников уже нельзя.');
        else Alert.alert('Не удалось удалить', 'Попробуйте ещё раз.');
      } },
    ]);
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader title="Управление" backLabel="Назад" onBack={() => navigation.goBack()} hairline />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.brand} /></View>
      </View>
    );
  }
  if (!manage || !manage.canManage) {
    return (
      <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
        <NavHeader title="Управление" backLabel="Назад" onBack={() => navigation.goBack()} hairline />
        <EmptyState icon="lock.fill" title="Нет доступа" subtitle="Управление челленджем доступно только его создателю." />
      </View>
    );
  }

  const unassigned = members.filter((m) => !m.teamId || !teams.some((t) => t.id === m.teamId));

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title="Управление" backLabel="Назад" onBack={() => navigation.goBack()} hairline />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {locked ? (
            <View style={{ marginHorizontal: 16, marginBottom: 6, backgroundColor: 'rgba(255,149,0,0.12)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderColor: 'rgba(255,149,0,0.3)' }}>
              <SF name="lock.fill" size={18} color={T.orange} />
              <Text style={[ty.subhead, { color: T.label, flex: 1 }]}>Челлендж уже идёт — изменения недоступны. Редактировать можно только до старта.</Text>
            </View>
          ) : null}

          {/* ── Challenge ── */}
          <ListSection header="Челлендж">
            <View style={{ padding: 14, gap: 12 }}>
              <LabeledInput label="Название" value={title} onChangeText={setTitle} editable={!locked} placeholder="Название челленджа" T={T} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput label="Длительность (дней)" value={days} onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))} editable={!locked} keyboardType="number-pad" T={T} />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput label="Цена (опц.)" value={price} onChangeText={setPrice} editable={!locked} placeholder="напр. 12 000 ₸" T={T} />
                </View>
              </View>
              {Number(days) > 0 && Number(days) < 14 ? (
                <Text style={[ty.caption1, { color: T.red }]}>Минимальная длительность — 14 дней.</Text>
              ) : null}
              {!locked ? (
                <Pressable onPress={saveChallenge} disabled={!chDirty || savingCh} accessibilityRole="button" accessibilityLabel="Сохранить" accessibilityState={{ disabled: !chDirty || savingCh, busy: savingCh }}
                  style={{ height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: chDirty ? T.brand : T.fillSecondary }}>
                  {savingCh ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <SF name="checkmark" size={15} color={chDirty ? '#fff' : T.labelTertiary} />
                      <Text style={[ty.headline, { color: chDirty ? '#fff' : T.labelTertiary }]}>Сохранить</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </ListSection>

          {/* ── Teams ── */}
          <ListSection header="Команды" footer={locked ? undefined : 'Размер — сколько человек можно набрать. Меньше числа уже принятых поставить нельзя.'}>
            {teams.map((team, i) => {
              const count = countFor(team.id);
              return (
                <View key={team.id} style={{ padding: 14, gap: 12, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: T.separator }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                      <SF name="person.3.fill" size={18} color={T.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={teamNames[team.id] ?? team.name}
                        onChangeText={(v) => setTeamNames((p) => ({ ...p, [team.id]: v }))}
                        editable={!locked}
                        onEndEditing={() => saveTeamName(team)}
                        returnKeyType="done"
                        placeholder="Название команды" placeholderTextColor={T.labelTertiary}
                        accessibilityLabel={`Название команды ${team.name}`}
                        style={[ty.headline, { color: T.label, paddingVertical: 6 }]}
                      />
                      {teamNote[team.id] ? (
                        <Text accessibilityLiveRegion="polite" style={[ty.caption2, { color: teamNote[team.id] === 'saved' ? T.greenText : T.redText }]} numberOfLines={1}>
                          {teamNote[team.id] === 'saved' ? 'Сохранено' : 'Не сохранено — прежнее название возвращено'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Size stepper */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={[ty.subhead, { color: T.label }]}>Размер команды</Text>
                      <Text style={[ty.caption1, { color: count >= team.capacity ? T.orange : T.labelSecondary }]}>{count} принято · {Math.max(0, team.capacity - count)} свободно</Text>
                    </View>
                    {locked ? (
                      <Text style={[ty.headline, { color: T.label }]}>{team.capacity}</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.fillTertiary, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 }}>
                        <StepBtn icon="minus" onPress={() => changeCapacity(team, -1)} T={T} />
                        <Text style={[ty.headline, { color: T.label, minWidth: 28, textAlign: 'center' }]}>{team.capacity}</Text>
                        <StepBtn icon="plus" onPress={() => changeCapacity(team, +1)} T={T} />
                      </View>
                    )}
                  </View>

                  {/* Captain */}
                  <Pressable onPress={() => pickCaptain(team)} disabled={locked} accessibilityRole="button"
                    accessibilityLabel={`Капитан: ${team.captainName || 'не назначен'}`} accessibilityState={{ disabled: locked }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: T.fillTertiary }}>
                    <SF name="star.fill" size={15} color={team.captainId ? T.brand : T.labelTertiary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[ty.caption1, { color: T.labelSecondary }]}>Капитан</Text>
                      <Text style={[ty.subheadEm, { color: team.captainId ? T.label : T.labelTertiary }]} numberOfLines={1}>{team.captainName || 'Не назначен'}</Text>
                    </View>
                    {!locked ? <SF name="chevron.right" size={13} color={T.labelTertiary} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </ListSection>

          {/* ── Participants ── */}
          <ListSection header="Участники" footer={locked ? undefined : 'Нажмите на участника, чтобы переместить его в другую команду или удалить.'}>
            {members.length === 0 ? (
              <View style={{ padding: 18, alignItems: 'center' }}>
                <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center' }]}>Пока никто не в командах. Принимайте заявки на экране «Заявки».</Text>
              </View>
            ) : (
              <>
                {teams.map((team) => {
                  const roster = members.filter((m) => m.teamId === team.id);
                  return (
                    <View key={team.id}>
                      <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }]} numberOfLines={1}>{team.name} · {roster.length}/{team.capacity}</Text>
                      {roster.length === 0 ? (
                        <Text style={[ty.caption1, { color: T.labelTertiary, paddingHorizontal: 16, paddingVertical: 8 }]}>Нет участников</Text>
                      ) : roster.map((m) => <MemberRow key={m.applicationId} m={m} captain={m.userId === team.captainId} locked={locked} onPress={() => memberMenu(m)} T={T} />)}
                    </View>
                  );
                })}
                {unassigned.length > 0 ? (
                  <View>
                    <Text style={[ty.footnoteEm, { color: T.labelSecondary, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }]} numberOfLines={1}>Без команды · {unassigned.length}</Text>
                    {unassigned.map((m) => <MemberRow key={m.applicationId} m={m} captain={false} locked={locked} onPress={() => memberMenu(m)} T={T} />)}
                  </View>
                ) : null}
              </>
            )}
          </ListSection>

          {/* Link to the applications review */}
          <Pressable onPress={() => navigation.navigate('ChallengeApplicants', { challengeId })} accessibilityRole="button" accessibilityLabel="Заявки на вступление"
            style={{ marginHorizontal: 16, marginTop: 4, height: 48, borderRadius: 14, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <SF name="person.2.fill" size={16} color={T.brand} />
            <Text style={[ty.headline, { color: T.brand }]}>Заявки на вступление</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function LabeledInput({ label, value, onChangeText, editable, placeholder, keyboardType, T }: { label: string; value: string; onChangeText: (v: string) => void; editable: boolean; placeholder?: string; keyboardType?: 'default' | 'number-pad'; T: any }) {
  const { ty } = useTheme();
  return (
    <View>
      <Text style={[ty.caption1, { color: T.labelSecondary, marginBottom: 5 }]} numberOfLines={1}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} editable={editable}
        placeholder={placeholder} placeholderTextColor={T.labelTertiary} keyboardType={keyboardType}
        style={{ backgroundColor: T.fillTertiary, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, color: editable ? T.label : T.labelSecondary, ...ty.body }}
      />
    </View>
  );
}

function StepBtn({ icon, onPress, T }: { icon: any; onPress: () => void; T: any }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={icon === 'minus' ? 'Уменьшить' : 'Увеличить'} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.cardBg, alignItems: 'center', justifyContent: 'center' }}>
      <SF name={icon} size={15} color={T.brand} />
    </Pressable>
  );
}

function MemberRow({ m, captain, locked, onPress, T }: { m: ManageMember; captain: boolean; locked: boolean; onPress: () => void; T: any }) {
  const { ty } = useTheme();
  const name = m.userName || m.userEmail || 'Участник';
  return (
    <Pressable onPress={onPress} disabled={locked} accessibilityRole="button"
      accessibilityLabel={`${name}${captain ? ', капитан' : ''}${m.status === 'pending' ? ', заявка' : ''}`}
      accessibilityHint={locked ? undefined : 'Переместить или удалить'} accessibilityState={{ disabled: locked }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[ty.subheadEm, { color: T.brand }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ty.body, { color: T.label }]} numberOfLines={1}>{name}{captain ? '  👑' : ''}</Text>
        {m.userEmail ? <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{m.userEmail}</Text> : null}
      </View>
      {m.status === 'pending' ? <Capsule bg="rgba(142,142,147,0.16)" color={T.labelSecondary}>заявка</Capsule> : null}
      {!locked ? <SF name="ellipsis" size={18} color={T.labelTertiary} /> : null}
    </Pressable>
  );
}
