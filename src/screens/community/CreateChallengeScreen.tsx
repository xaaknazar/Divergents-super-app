// Creator-only form: publish a new challenge. Daily tasks are seeded
// server-side, so this form only captures the program shell — title, start
// date, duration, teams (each capped at 30), optional price and categories.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../theme/ThemeContext';
import { useLang, tr } from '../../state/LanguageContext';
import { SF } from '../../components/SFIcon';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton, ty } from '../../components/ui';
import { createChallenge, NewChallengeTeam } from '../../data/community';
import { CommunityStackParams } from '../../navigation/types';
import { hSuccess } from '../../lib/haptics';

type Props = NativeStackScreenProps<CommunityStackParams, 'CreateChallenge'>;

const TEAM_CAPACITY = 30;

// Accepts ГГГГ-ММ-ДД and returns an ISO string, or null when invalid.
function toISO(input: string): string | null {
  const s = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseTeams(input: string): NewChallengeTeam[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, capacity: TEAM_CAPACITY }));
}

function parseList(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}

export function CreateChallengeScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('21');
  const [teamsText, setTeamsText] = useState('');
  const [price, setPrice] = useState('');
  const [categories, setCategories] = useState('');
  const [busy, setBusy] = useState(false);

  const startISO = useMemo(() => toISO(date), [date]);
  const teams = useMemo(() => parseTeams(teamsText), [teamsText]);
  const durationDays = parseInt(duration, 10);
  const dateInvalid = date.trim().length > 0 && !startISO;

  const canSubmit =
    title.trim().length > 1 &&
    !!startISO &&
    Number.isFinite(durationDays) && durationDays > 0 &&
    teams.length > 0 &&
    !busy;

  const submit = async () => {
    if (!canSubmit || !startISO) return;
    setBusy(true);
    try {
      const token = await getToken();
      const res = await createChallenge({
        title: title.trim(),
        startISO,
        durationDays,
        teams,
        price: price.trim() ? Number(price.trim().replace(/\s/g, '')) : null,
        categories: parseList(categories),
      }, token ?? '');
      if (res.ok) {
        hSuccess();
        Alert.alert(tr('Челлендж создан'), tr('Новый челлендж опубликован и появится в наборе.'), [
          { text: tr('Готово'), onPress: () => navigation.navigate('CommunityHome', { refresh: Date.now() }) },
        ]);
      } else if (res.status === 403) {
        Alert.alert(tr('Недостаточно прав'), tr('Только организаторы могут создавать челленджи.'));
      } else {
        Alert.alert(tr('Не удалось создать'), tr('Проверьте подключение и попробуйте ещё раз.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <FormHeader title={tr('Новый челлендж')} onCancel={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <Field label={tr('НАЗВАНИЕ')}>
            <TextInput value={title} onChangeText={setTitle} placeholder={tr('напр. Весенний марафон')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Field label={tr('ДАТА СТАРТА (ГГГГ-ММ-ДД)')} hint={dateInvalid ? tr('Введите дату в формате ГГГГ-ММ-ДД') : undefined}>
            <View style={[inpRow(T), dateInvalid ? { borderColor: T.red, borderWidth: 1 } : null]}>
              <SF name="calendar" size={16} color={T.labelTertiary} />
              <TextInput value={date} onChangeText={setDate} placeholder="2026-07-01" placeholderTextColor={T.labelTertiary} keyboardType="numbers-and-punctuation" autoCapitalize="none" style={[ty.body, { flex: 1, paddingVertical: 12, color: T.label }]} />
            </View>
          </Field>

          <Field label={tr('ДЛИТЕЛЬНОСТЬ (ДНЕЙ)')}>
            <TextInput value={duration} onChangeText={(t) => setDuration(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="21" placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Field label={tr('КОМАНДЫ (через запятую)')} hint={teams.length > 0 ? `${teams.length} ${tr('команд · по')} ${TEAM_CAPACITY} ${tr('чел.')}` : tr('Напр.: Альфа, Бета, Гамма')}>
            <TextInput value={teamsText} onChangeText={setTeamsText} placeholder={tr('Альфа, Бета, Гамма')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Field label={tr('КАТЕГОРИИ (необязательно, через запятую)')}>
            <TextInput value={categories} onChangeText={setCategories} placeholder={tr('Чтение, No Sugar, Активность')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Field label={tr('ЦЕНА (₸, необязательно)')}>
            <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder={tr('0 — бесплатно')} placeholderTextColor={T.labelTertiary} style={inp(T)} />
          </Field>

          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 4, marginLeft: 4 }]}>
            {tr('Ежедневные задания (шаги, чтение, без сахара) добавятся автоматически.')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <PrimaryButton label={tr('Создать челлендж')} icon="flame.fill" loading={busy} color={canSubmit ? T.brand : T.labelTertiary} onPress={submit} />
      </View>
    </View>
  );
}

// ─── Shared modal-form atoms (match AddPlaceScreen's iOS form style) ─────────
export function FormHeader({ title, onCancel }: { title: string; onCancel: () => void }) {
  return <NavHeader title={title} backLabel={tr('Отмена')} onBack={onCancel} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>{label}</Text>
      {children}
      {hint ? <Text style={[ty.caption1, { color: T.labelTertiary, marginTop: 6, marginLeft: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function inp(T: any) {
  return { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, ...ty.body };
}
export function inpRow(T: any) {
  return { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: T.cardBg, borderRadius: 12, paddingHorizontal: 14, borderColor: 'transparent' };
}
