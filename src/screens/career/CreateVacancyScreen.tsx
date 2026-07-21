// Create a vacancy from the app (role-gated: only users with canCreate reach it).
// Posts to /api/mobile/vacancies; the server authorizes by role. On success the
// live catalog is reloaded so the new vacancy appears immediately.
import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { NavHeader } from '../../components/NavHeader';
import { PrimaryButton, ty } from '../../components/ui';
import { useCareer } from '../../state/CareerContext';
import { createVacancy } from '../../data/career';
import { tr } from '../../state/LanguageContext';

const FORMATS = ['Офис', 'Гибрид', 'Удалёнка'];

export function CreateVacancyScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { reloadJobs } = useCareer();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [format, setFormat] = useState('Офис');
  const [salary, setSalary] = useState('');
  const [level, setLevel] = useState('');
  const [about, setAbout] = useState('');
  const [reqs, setReqs] = useState('');
  const [busy, setBusy] = useState(false);

  const ok = title.trim().length > 1 && company.trim().length > 0;
  const inp = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label, borderWidth: 0.5, borderColor: T.cardBorder, ...ty.body } as any;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{label}</Text>
      {children}
    </View>
  );

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const requirements = reqs.split('\n').map((s) => s.trim()).filter(Boolean);
      const done = await createVacancy(token, {
        title: title.trim(), company: company.trim(), city: city.trim(), format,
        salary: salary.trim(), level: level.trim(), about: about.trim(), requirements,
      });
      if (done) {
        await reloadJobs();
        Alert.alert('Вакансия создана', 'Она появилась в каталоге.', [{ text: tr('Готово'), onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Не удалось создать', 'Проверьте подключение и права доступа.');
      }
    } catch {
      Alert.alert('Не удалось создать', 'Проверьте подключение и попробуйте снова.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <NavHeader title="Новая вакансия" backLabel={tr('Отмена')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <Field label="Должность *"><TextInput value={title} onChangeText={setTitle} placeholder="напр. HR-менеджер" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
          <Field label="Компания *"><TextInput value={company} onChangeText={setCompany} placeholder="напр. KEX Group" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
          <Field label="Город"><TextInput value={city} onChangeText={setCity} placeholder="напр. Алматы" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
          <Field label="Формат">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FORMATS.map((f) => {
                const on = format === f;
                return (
                  <Pressable key={f} onPress={() => setFormat(f)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                    <Text style={[ty.footnoteEm, { color: on ? '#fff' : T.label }]}>{f}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Зарплата"><TextInput value={salary} onChangeText={setSalary} placeholder="напр. от 500 000 ₸" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
          <Field label="Уровень"><TextInput value={level} onChangeText={setLevel} placeholder="напр. Middle / Senior" placeholderTextColor={T.labelTertiary} style={inp} /></Field>
          <Field label="О вакансии"><TextInput value={about} onChangeText={setAbout} placeholder="Опишите роль и задачи" placeholderTextColor={T.labelTertiary} multiline style={[inp, { minHeight: 100, textAlignVertical: 'top' }]} /></Field>
          <Field label="Требования (по одному на строку)"><TextInput value={reqs} onChangeText={setReqs} placeholder={'Опыт от 2 лет\nЗнание Excel\nАнглийский B2'} placeholderTextColor={T.labelTertiary} multiline style={[inp, { minHeight: 100, textAlignVertical: 'top' }]} /></Field>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          <PrimaryButton label="Опубликовать" icon="checkmark" loading={busy} disabled={!ok || busy} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
