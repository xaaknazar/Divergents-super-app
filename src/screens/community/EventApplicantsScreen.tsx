import { FieldValueRow } from '../../components/FieldValueRow';
import { ApplicationStatusBadge, applicationStatusLabel } from '../../components/ApplicationStatusBadge';
import { Wrapper } from '../../components/Wrapper';
// Заявки на офлайн-событие: поездку или спортивную встречу.
//
// Раньше такого экрана не было. Человек создавал поездку в приложении, к нему
// шли заявки — и он их не видел: список открывался только в админ-панели сайта
// и только по праву «поездки». Заявки копились нерассмотренными, а на карточке
// выглядели готовым составом, потому что счётчик «идут» считал их вместе с
// одобренными.
//
// Устроено как разбор заявок в челлендже: список с псевдонимами, по нажатию —
// для администратора — анкета Talentslab, для остальных — только имя и решение.
// У поездки нет команд, поэтому нет
// и выбора команды.
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { ListSection, Button } from '../../components/ui';
import { EmptyState, ErrorState } from '../../components/StateViews';
import { hSuccess } from '../../lib/haptics';
import {
  fetchEventApplicants, decideEventApplicant,
  EventApplicant, EventApplicants, EventAppStatus, EventKind,
} from '../../data/community';
import { resumeRows } from '../../data/talentslab';
import { CommunityStackParams } from '../../navigation/types';
import * as pl from '../../data/plural';

type Props = NativeStackScreenProps<CommunityStackParams, 'EventApplicants'>;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Новая',
  approved: 'Принят',
  rejected: 'Отклонён',
  // Записи, сделанные в спорте до появления одобрения.
  going: 'Идёт',
  cancelled: 'Снялся',
};



export function EventApplicantsScreen({ route, navigation }: Props) {
  // С запасом: уведомление могло прийти без параметров, и падение экрана
  // выглядело бы для человека как вылет из приложения.
  const kind: EventKind = route.params?.kind;
  const eventId = route.params?.eventId ?? '';
  const eventTitle = route.params?.title ?? '';
  const { T, ty } = useTheme();
  const { getToken, userId } = useAuth();
  const insets = useSafeAreaInsets();
  const decisionLock = useRef(false);
  const loadGeneration = useRef(0);

  const [data, setData] = useState<EventApplicants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<EventApplicant | null>(null);
  const [busy, setBusy] = useState(false);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    if (!eventId || !['trip', 'meetup', 'sport'].includes(kind)) { setError(true); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const token = await getTokenRef.current();
      const res = await fetchEventApplicants(kind, eventId, token);
      if (generation !== loadGeneration.current) return;
      if (!res) { setError(true); return; }
      setData(res);
    } catch {
      if (generation === loadGeneration.current) setError(true);
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [kind, eventId, userId]);

  useFocusEffect(useCallback(() => {
    setData(null); setSel(null); void load();
    return () => { ++loadGeneration.current; };
  }, [load]));

  const decide = async (applicant: EventApplicant, status: EventAppStatus) => {
    if (decisionLock.current || applicant.status === 'cancelled') return;
    decisionLock.current = true;
    setBusy(true);
    try {
      const token = await getTokenRef.current();
      const res = await decideEventApplicant(kind, eventId, applicant.userId, status, token);
      if (res.ok) {
        hSuccess();
        setSel(null);
        await load();
        return;
      }
      if (res.reason === 'full') {
        Alert.alert(
          'Свободных мест нет',
          `Состав уже набран: ${res.taken ?? '?'} из ${res.spots ?? '?'}. Сначала освободите место, если кто-то отменил участие.`,
        );
        return;
      }
      if (res.reason === 'forbidden') {
        Alert.alert('Нет доступа', 'Разбирать заявки может организатор события или администратор.');
        return;
      }
      if (res.reason === 'network') {
        Alert.alert('Нет связи', 'Проверьте подключение и попробуйте снова.');
        return;
      }
      Alert.alert('Не получилось', 'Заявка не найдена — возможно, её уже обработали.');
    } catch {
      Alert.alert('Нет связи', 'Не удалось получить результат. Обновите список перед повторным решением.');
    } finally {
      decisionLock.current = false;
      setBusy(false);
    }
  };

  const items = data?.applications ?? [];
  const counts = data?.counts;
  const canViewProfiles = data?.canViewProfiles === true;
  const p = canViewProfiles ? sel?.profile ?? null : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title="Заявки" subtitle={eventTitle || undefined} backLabel={kind === 'trip' ? 'Поездка' : kind === 'sport' ? 'Спорт' : 'Мероприятие'} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="person.2.fill"
          title="Пока нет заявок"
          subtitle="Как только кто-то подаст заявку, она появится здесь."
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: 30 }}>
          {counts ? (
            <Text style={[ty.footnote, { color: T.labelSecondary, paddingHorizontal: 20, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
              {pl.applications(counts.total)} · {counts.pending} ждут решения · {counts.approved} принято
            </Text>
          ) : null}
          {items.map((a) => {

            // В списке — ПСЕВДОНИМ. ФИО и почта появляются, только когда
            // администратор откроет заявку. Обычный организатор их не получает.
            const name = a.userName || 'Участник';
            return (
              <Pressable
                key={a.id}
                onPress={() => setSel(a)}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${applicationStatusLabel(a.status, 'event')}`}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 10,
                  padding: 14, borderRadius: 16, borderCurve: 'continuous', borderWidth: 0.5, borderColor: T.cardBorder,
                  minHeight: 48, opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.brand }]}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>
                    {canViewProfiles ? (a.profile?.completeness != null ? `анкета ${a.profile.completeness}%` : 'анкета не заполнена') : 'Публичное имя участника'}
                  </Text>
                </View>
                <ApplicationStatusBadge status={a.status} context="event" />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Карточка заявителя */}
      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
          <NavHeader title={sel?.userName || 'Участник'} backLabel="Закрыть" onBack={() => setSel(null)} />
          <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 24 }}>
            <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Заявка">
              <View style={{ padding: 14, gap: 8 }}>
                <FieldValueRow label="Статус" value={sel ? STATUS_LABEL[sel.status] ?? sel.status : ''} hideWhenEmpty />
                {/* ФИО и почта доступны только администраторам. */}
                {canViewProfiles ? <FieldValueRow label="Имя" value={sel?.fullName} hideWhenEmpty /> : null}
                {canViewProfiles ? <FieldValueRow label="Почта" value={sel?.userEmail} hideWhenEmpty /> : null}
              </View>
            </ListSection></Wrapper>

            {!canViewProfiles ? (
              <Text style={[ty.subhead, { color: T.labelSecondary, padding: 20 }]}>Анкеты и контакты доступны только администраторам. Вы можете принять или отклонить заявку по публичному имени.</Text>
            ) : !p ? (
              <View style={{ padding: 20, gap: 6 }}>
                <Text style={[ty.subhead, { color: T.label }]}>Анкета не заполнена.</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>
                  Человек ещё не заполнил анкету в Talentslab — решайте по имени и контактам.
                </Text>
              </View>
            ) : (
              <Wrapper marginTop={6} marginHorizontal={16}><ListSection header="Анкета">
                <View style={{ padding: 14, gap: 8 }}>
                  {resumeRows(p?.resume ?? null).map((r, i) => <FieldValueRow key={i} label={r.label} value={r.value} hideWhenEmpty />)}
                </View>
              </ListSection></Wrapper>
            )}
          </ScrollView>

          {/* Решение. «Вернуть на рассмотрение» нужно, чтобы отказ не был
              необратимым: организатор мог нажать не то. */}
          <View style={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 8, borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: T.cardBg }}>
            {sel && sel.status !== 'cancelled' && sel.status !== 'approved' && sel.status !== 'going' ? (
              <Button label="Принять" icon="checkmark" loading={busy} onPress={() => sel && decide(sel, 'approved')} tone="success" />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sel && sel.status !== 'cancelled' && sel.status !== 'rejected' ? (
                <Pressable
                  disabled={busy}
                  onPress={() => sel && decide(sel, 'rejected')}
                  accessibilityRole="button"
                  accessibilityLabel="Отклонить заявку"
                  style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,59,48,0.12)', opacity: pressed || busy ? 0.6 : 1 })}
                >
                  <Text style={[ty.headline, { color: T.redText }]}>Отклонить</Text>
                </Pressable>
              ) : null}
              {sel && sel.status !== 'cancelled' && sel.status !== 'pending' ? (
                <Pressable
                  disabled={busy}
                  onPress={() => sel && decide(sel, 'pending')}
                  accessibilityRole="button"
                  accessibilityLabel="Вернуть заявку на рассмотрение"
                  style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: T.fillSecondary, opacity: pressed || busy ? 0.6 : 1 })}
                >
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>На рассмотрение</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
