// Mandatory resume gate shown after sign-in when the user's Talentslab resume
// is not fully filled. There is NO skip: the user must complete every required
// field (completeness → 100%) before the app (Tabs) becomes reachable. While
// the gate is still checking the server it shows a branded spinner so a
// candidate already complete on the website is never flashed the form.
import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, LayoutAnimation, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../components/SFIcon';
import { Logo } from '../components/Logo';
import { PrimaryButton, ty } from '../components/ui';
import { ResumeFieldInput } from '../components/ResumeField';
import { AssessmentsBlock } from '../components/AssessmentsBlock';
import { ProfilePhotoField } from '../components/ProfilePhotoField';
import { RESUME_STEPS } from '../data/resumeSchema';
import { useResume } from '../state/useResume';
import { useResumeGate } from '../state/ResumeGateContext';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { signOutAndClear } from '../state/signOut';
import { useLang, tr } from '../state/LanguageContext';

const missingRequired = (fields: typeof RESUME_STEPS[number]['fields'], answers: Record<string, any>) =>
  fields.filter((f) => !f.optional).filter((f) => {
    const v = answers[f.key];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  });

export function ResumeGateScreen() {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { ready, markComplete } = useResumeGate();
  const { answers, setField, completeness, submit, submitting } = useResume();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const total = RESUME_STEPS.length;
  const [step, setStep] = useState(0);
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  const go = (n: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(n); };

  // «Назад ко входу»: выйти из аккаунта и вернуться на экран логина/регистрации.
  const backToLogin = () => {
    Alert.alert(
      tr('Вернуться ко входу?'),
      tr('Вы выйдете из аккаунта и вернётесь на экран входа.'),
      [
        { text: tr('Отмена'), style: 'cancel' },
        {
          text: tr('Выйти'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutAndClear({ getToken, signOut });
            } catch {
              Alert.alert(tr('Не удалось выйти'), tr('Проверьте подключение и попробуйте снова.'));
            }
          },
        },
      ],
    );
  };

  // Index of the first step that still has missing required fields (for jumping
  // the user straight to what's left).
  const firstIncompleteStep = useMemo(() => {
    const i = RESUME_STEPS.findIndex((st) => missingRequired(st.fields, answers).length > 0);
    return i < 0 ? 0 : i;
  }, [answers]);

  // While the gate is still resolving (cached flag + server check), show a
  // spinner instead of the form.
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: T.systemBg, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Logo size={54} />
        <ActivityIndicator color={T.brand} />
        <Text style={[ty.subhead, { color: T.labelSecondary }]}>{tr('Проверяем анкету…')}</Text>
      </View>
    );
  }

  const next = () => {
    const missing = missingRequired(s.fields, answers);
    if (missing.length) { Alert.alert(tr('Заполните обязательные поля'), missing.map((m) => `• ${m.label}`).join('\n')); return; }
    go(step + 1);
  };

  const finish = async () => {
    // Enforce every required field across all steps before entry.
    const missing = missingRequired(s.fields, answers);
    if (missing.length) { Alert.alert(tr('Заполните обязательные поля'), missing.map((m) => `• ${m.label}`).join('\n')); return; }
    if (completeness < 100) {
      Alert.alert(
        tr('Анкета не заполнена'),
        tr('Заполните все обязательные поля, чтобы продолжить.'),
        [{ text: tr('Готово'), onPress: () => go(firstIncompleteStep) }],
      );
      return;
    }
    // Send to Talentslab (retries internally). The resume is 100% filled either
    // way, so we let the user in even if the network send fails — it stays saved
    // locally and syncs on the next open.
    const ok = await submit();
    markComplete();
    if (!ok) {
      Alert.alert(
        tr('Анкета сохранена'),
        tr('Нет связи с Talentslab — отправим данные, как только появится сеть.'),
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Header — resume is mandatory to enter, but the user may go back to login. */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={backToLogin} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginBottom: 10 }}>
          <SF name="chevron.left" size={15} color={T.brandAccent} />
          <Text style={[ty.body, { color: T.brandAccent }]} numberOfLines={1}>{tr('Вход')}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[ty.headline, { color: T.label }]} numberOfLines={1}>{tr('Заполните анкету')} · {completeness}%</Text>
            <Text style={[ty.caption1, { color: T.labelSecondary }]} numberOfLines={1}>{tr('Нужно заполнить резюме, чтобы продолжить')}</Text>
          </View>
        </View>
      </View>

      {/* Stepper */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
        {RESUME_STEPS.map((st, i) => (
          <Pressable key={st.key} onPress={() => go(i)} style={{ flex: 1 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? T.brand : T.fillSecondary }} />
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={s.icon} size={20} color={T.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]} numberOfLines={1}>{tr('Шаг')} {step + 1} {tr('из')} {total}</Text>
              <Text style={[ty.title3, { color: T.label }]} numberOfLines={1}>{s.title}</Text>
            </View>
          </View>

          {s.key === 'personal' ? <ProfilePhotoField /> : null}

          {s.fields.map((f) => (
            <ResumeFieldInput key={f.key} field={f} value={answers[f.key]} onChange={(v) => setField(f.key, v)} />
          ))}

          {s.key === 'assessments' ? <AssessmentsBlock /> : null}
        </ScrollView>

        {/* Footer */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {step > 0 ? <PrimaryButton label={tr('Назад')} color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} /> : null}
          {last ? (
            <PrimaryButton label={tr('Войти в приложение')} icon="arrow.right" loading={submitting} style={{ flex: 2 }} onPress={finish} />
          ) : (
            <PrimaryButton label={tr('Далее')} icon="arrow.right" style={{ flex: 2 }} onPress={next} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
