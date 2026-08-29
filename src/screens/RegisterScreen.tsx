import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, LayoutAnimation } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../components/SFIcon';
import { PrimaryButton } from '../components/ui';
import { ResumeFieldInput } from '../components/ResumeField';
import { RESUME_STEPS } from '../data/resumeSchema';
import { useResume } from '../state/useResume';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import { fetchTalentProfile } from '../data/talentslab';
import { signOutAndClear } from '../state/signOut';
import { useAppFlow } from '../state/AppFlowContext';
import { useResumeGate } from '../state/ResumeGateContext';
import { useLang, tr } from '../state/LanguageContext';
import { RootStackParams } from '../navigation/types';

// Required fields that are still empty, grouped so we can point the user to the
// first incomplete step.
const missingRequired = (fields: typeof RESUME_STEPS[number]['fields'], answers: Record<string, any>) =>
  fields.filter((f) => !f.optional).filter((f) => {
    const v = answers[f.key];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  });

type Props = NativeStackScreenProps<RootStackParams, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { T, ty } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { answers, setField, completeness, submit, submitting } = useResume();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  // Did submit() actually reach Talentslab? false → saved on-device only, so the
  // done screen must not claim it was sent to the server.
  const [savedRemote, setSavedRemote] = useState(false);
  const [tlPct, setTlPct] = useState<number | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { finishRegistration } = useAppFlow();
  const { markComplete } = useResumeGate();
  const total = RESUME_STEPS.length;
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  const go = (n: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(n); };

  // «Назад ко входу»: выйти из аккаунта и вернуться на экран логина/регистрации.
  // Регистрация ещё не завершена — сбрасываем флаг и локальные данные, затем signOut
  // (RootNavigator покажет AuthScreen, т.к. isSignedIn станет false).
  const backToLogin = () => {
    Alert.alert(
      tr('Вернуться ко входу?'),
      tr('Регистрация не завершена. Вы выйдете из аккаунта и вернётесь на экран входа.'),
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
  // The резюме is fully filled by the time we reach the done screen (finish
  // enforces every required field), so mark the gate satisfied and enter.
  const enter = () => { markComplete(); finishRegistration(); };

  const next = () => {
    const missing = missingRequired(s.fields, answers);
    if (missing.length) { Alert.alert(tr('Заполните обязательные поля'), missing.map((m) => `• ${m.label}`).join('\n')); return; }
    go(step + 1);
  };

  const finish = async () => {
    // Enforce EVERY required field across all steps — the stepper lets the user
    // jump ahead, so validating only the current step would let gaps through.
    const firstGap = RESUME_STEPS.findIndex((st) => missingRequired(st.fields, answers).length > 0);
    if (firstGap >= 0) {
      const missing = missingRequired(RESUME_STEPS[firstGap].fields, answers);
      Alert.alert(
        tr('Заполните обязательные поля'),
        missing.map((m) => `• ${m.label}`).join('\n'),
        [{ text: tr('Готово'), onPress: () => go(firstGap) }],
      );
      return;
    }
    const ok = await submit();
    // Show local completeness immediately; if the submit reached Talentslab we
    // refine it below with the server-reported value. (Previously both ternary
    // branches were identical — a no-op.)
    setTlPct(completeness);
    setSavedRemote(ok);
    setDone(true);
    if (ok) {
      try {
        const token = await getToken();
        const email = user?.primaryEmailAddress?.emailAddress ?? null;
        const prof = await fetchTalentProfile(token, email);
        if (prof?.found && typeof prof.completeness === 'number') setTlPct(prof.completeness);
      } catch {}
    }
  };

  if (done) {
    const pct = tlPct ?? completeness;
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: T.systemBg }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="checkmark.seal.fill" size={48} color={T.brand} />
          </View>
          <Text style={[ty.title1, { color: T.label, marginTop: 18, textAlign: 'center' }]}>{tr('Регистрация завершена')}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center' }]}>{savedRemote
            ? tr('Анкета заполнена и сохранена в Talentslab. Результаты Gallup, MBTI и Гарднера появятся в разделе «Карьера».')
            : tr('Анкета сохранена на устройстве — отправим в Talentslab, как только появится связь.')}</Text>
        </View>
        <View style={{ marginTop: 28, backgroundColor: T.cardBg, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: T.cardBorder }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <Text style={[ty.subheadEm, { color: T.label, flex: 1 }]}>{tr('Заполненность анкеты Talentslab')}</Text>
            <Text style={[ty.title3, { color: T.brand, flexShrink: 0 }]}>{pct}%</Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: T.fillSecondary, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: 10, borderRadius: 5, backgroundColor: T.brand }} />
          </View>
          <Text style={[ty.caption1, { color: T.labelSecondary, marginTop: 10 }]}>
            {pct >= 100 ? tr('Анкета заполнена полностью.') : tr('Продолжить заполнение можно в разделе «Карьера».')}
          </Text>
        </View>
        <PrimaryButton label={tr('Войти в приложение')} icon="arrow.right" style={{ marginTop: 24 }} onPress={enter} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={backToLogin} accessibilityRole="button" accessibilityLabel={tr('Вернуться ко входу')} style={{ minWidth: 64, minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <SF name="chevron.left" size={15} color={T.brandAccent} />
          <Text style={[ty.body, { color: T.brandAccent }]}>{tr('Вход')}</Text>
        </Pressable>
        <Text style={[ty.headline, { color: T.label, flex: 1, textAlign: 'center', paddingHorizontal: 8 }]}>{tr('Регистрация')} · {completeness}%</Text>
        <View style={{ width: 64 }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
        {RESUME_STEPS.map((st, i) => (
          <Pressable key={st.key} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`${tr('Шаг')} ${i + 1} ${tr('из')} ${total}: ${st.title}`} accessibilityState={{ selected: i === step }} style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? T.brand : T.fillSecondary }} />
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
              <SF name={s.icon} size={20} color={T.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]}>{tr('Шаг')} {step + 1} {tr('из')} {total}</Text>
              <Text style={[ty.title3, { color: T.label }]}>{s.title}</Text>
            </View>
          </View>

          {s.fields.map((f) => (
            <ResumeFieldInput key={f.key} field={f} value={answers[f.key]} onChange={(v) => setField(f.key, v)} />
          ))}

          {s.key === 'assessments' ? (
            <View style={{ marginTop: 8, backgroundColor: T.brandTinted, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10 }}>
              <SF name="doc.fill" size={18} color={T.brand} />
              <Text style={[ty.caption1, { color: T.label, flex: 1 }]}>
                {lang === 'ru'
                  ? 'Тесты Gallup, MBTI и Гарднера проходятся на Talentslab — после обработки результаты появятся в разделе «Карьера».'
                  : 'The Gallup, MBTI and Gardner tests are taken on Talentslab — after processing the results appear in the Career section.'}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {step > 0 ? <PrimaryButton label={tr('Назад')} color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} /> : null}
          {last ? (
            <PrimaryButton label={tr('Завершить')} icon="checkmark" loading={submitting} style={{ flex: 2 }} onPress={finish} />
          ) : (
            <PrimaryButton label={tr('Далее')} icon="arrow.right" style={{ flex: 2 }} onPress={next} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
