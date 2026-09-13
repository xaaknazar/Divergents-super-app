// Заявки на офлайн-событие: поездку или спортивную встречу.
//
// Раньше такого экрана не было. Человек создавал поездку в приложении, к нему
// шли заявки — и он их не видел: список открывался только в админ-панели сайта
// и только по праву «поездки». Заявки копились нерассмотренными, а на карточке
// выглядели готовым составом, потому что счётчик «идут» считал их вместе с
// одобренными.
//
// Устроено как разбор заявок в челлендже: список с псевдонимами, по нажатию —
// анкета Talentslab и решение. Отличие одно: у поездки нет команд, поэтому нет
// и выбора команды.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { NavHeader } from '../../components/NavHeader';
import { SF } from '../../components/SFIcon';
import { Capsule, ListSection, PrimaryButton } from '../../components/ui';
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

function statusMeta(status: string, T: any): { label: string; bg: string; color: string } {
  if (status === 'approved' || status === 'going') {
    return { label: STATUS_LABEL[status], bg: 'rgba(52,199,89,0.16)', color: T.greenText };
  }
  if (status === 'rejected' || status === 'cancelled') {
    return { label: STATUS_LABEL[status], bg: 'rgba(255,59,48,0.14)', color: T.redText };
  }
  return { label: STATUS_LABEL.pending, bg: 'rgba(142,142,147,0.16)', color: T.labelSecondary };
}

function Row({ T, k, v }: { T: any; k: string; v?: string | null }) {
  const { ty } = useTheme();
  if (!v) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[ty.subhead, { color: T.labelSecondary, flexShrink: 0 }]}>{k}</Text>
      <Text style={[ty.subhead, { color: T.label, flex: 1, textAlign: 'right' }]}>{v}</Text>
    </View>
  );
}

export function EventApplicantsScreen({ route, navigation }: Props) {
  // С запасом: уведомление могло прийти без параметров, и падение экрана
  // выглядело бы для человека как вылет из приложения.
  const kind: EventKind = route.params?.kind === 'sport' ? 'sport' : 'trip';
  const eventId = route.params?.eventId ?? '';
  const eventTitle = route.params?.title ?? '';
  const { T, ty } = useTheme();
  const { getToken } = useAuth();

  const [data, setData] = useState<EventApplicants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<EventApplicant | null>(null);
  const [busy, setBusy] = useState(false);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const load = useCallback(async () => {
    if (!eventId) { setError(true); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const token = await getTokenRef.current();
      const res = await fetchEventApplicants(kind, eventId, token);
      if (!res) { setError(true); return; }
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [kind, eventId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (applicant: EventApplicant, status: EventAppStatus) => {
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
          `Состав уже набран: ${res.taken ?? '?'} из ${res.spots ?? '?'}. Освободите место или увеличьте вместимость события.`,
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
    } finally {
      setBusy(false);
    }
  };

  const items = data?.applications ?? [];
  const counts = data?.counts;
  const p = sel?.profile ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader
        title="Заявки"
        subtitle={eventTitle || undefined}
        backLabel={kind === 'trip' ? 'Поездка' : 'Спорт'}
        onBack={() => navigation.goBack()}
        hairline
      />

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
            const meta = statusMeta(a.status, T);
            // В списке — ПСЕВДОНИМ. ФИО и почта появляются, только когда
            // организатор откроет заявку: до решения это лишние личные данные.
            const name = a.userName || 'Участник';
            return (
              <Pressable
                key={a.id}
                onPress={() => setSel(a)}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${meta.label}`}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: T.cardBg, marginHorizontal: 16, marginBottom: 10,
                  padding: 14, borderRadius: 16, borderWidth: 0.5, borderColor: T.cardBorder,
                  minHeight: 48, opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[ty.headline, { color: T.brand }]}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[ty.headline, { color: T.label }]} numberOfLines={2}>{name}</Text>
                  <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>
                    {a.profile?.completeness != null ? `анкета ${a.profile.completeness}%` : 'анкета не заполнена'}
                  </Text>
                </View>
                <Capsule bg={meta.bg} color={meta.color}>{meta.label}</Capsule>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Карточка заявителя */}
      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
          <NavHeader title={sel?.userName || 'Участник'} backLabel="Закрыть" onBack={() => setSel(null)} hairline />
          <ScrollView contentContainerStyle={{ paddingVertical: 10, paddingBottom: 24 }}>
            <ListSection header="Заявка">
              <View style={{ padding: 14, gap: 8 }}>
                <Row T={T} k="Статус" v={sel ? STATUS_LABEL[sel.status] ?? sel.status : ''} />
                {/* ФИО и почта — только организатору и только здесь: он решает,
                    кого берёт, и должен понимать, кто перед ним. */}
                <Row T={T} k="Имя" v={sel?.fullName} />
                <Row T={T} k="Почта" v={sel?.userEmail} />
              </View>
            </ListSection>

            {!p ? (
              <View style={{ padding: 20, gap: 6 }}>
                <Text style={[ty.subhead, { color: T.label }]}>Анкета не заполнена.</Text>
                <Text style={[ty.caption1, { color: T.labelSecondary }]}>
                  Человек ещё не заполнил анкету в Talentslab — решайте по имени и контактам.
                </Text>
              </View>
            ) : (
              <ListSection header="Анкета">
                <View style={{ padding: 14, gap: 8 }}>
                  {resumeRows(p?.resume ?? null).map((r, i) => <Row key={i} T={T} k={r.label} v={r.value} />)}
                </View>
              </ListSection>
            )}
          </ScrollView>

          {/* Решение. «Вернуть на рассмотрение» нужно, чтобы отказ не был
              необратимым: организатор мог нажать не то. */}
          <View style={{ padding: 16, gap: 8, borderTopWidth: 0.5, borderTopColor: T.separator, backgroundColor: T.cardBg }}>
            {sel && sel.status !== 'approved' && sel.status !== 'going' ? (
              <PrimaryButton
                label="Принять"
                icon="checkmark"
                color={T.green}
                loading={busy}
                onPress={() => sel && decide(sel, 'approved')}
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sel && sel.status !== 'rejected' ? (
                <Pressable
                  disabled={busy}
                  onPress={() => sel && decide(sel, 'rejected')}
                  accessibilityRole="button"
                  accessibilityLabel="Отклонить заявку"
                  style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,59,48,0.12)', opacity: pressed || busy ? 0.6 : 1 })}
                >
                  <Text style={[ty.headline, { color: T.redText }]}>Отклонить</Text>
                </Pressable>
              ) : null}
              {sel && sel.status !== 'pending' ? (
                <Pressable
                  disabled={busy}
                  onPress={() => sel && decide(sel, 'pending')}
                  accessibilityRole="button"
                  accessibilityLabel="Вернуть заявку на рассмотрение"
                  style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.fillSecondary, opacity: pressed || busy ? 0.6 : 1 })}
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
