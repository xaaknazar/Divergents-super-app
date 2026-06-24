import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, LayoutAnimation } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../components/SFIcon';
import { PrimaryButton, ty } from '../components/ui';
import { ResumeFieldInput } from '../components/ResumeField';
import { RESUME_STEPS } from '../data/resumeSchema';
import { useResume } from '../state/useResume';
import { RootStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setField, completeness, submit, submitting } = useResume();
  const [step, setStep] = useState(0);
  const total = RESUME_STEPS.length;
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  const go = (n: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(n); };
  const enter = () => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });

  const next = () => {
    // require non-optional fields of the current step
    const missing = s.fields.filter((f) => !f.optional).filter((f) => {
      const v = answers[f.key];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length) { Alert.alert('Заполните обязательные поля', missing.map((m) => `• ${m.label}`).join('\n')); return; }
    go(step + 1);
  };

  const finish = async () => {
    const missing = s.fields.filter((f) => !f.optional).filter((f) => {
      const v = answers[f.key];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length) { Alert.alert('Заполните обязательные поля', missing.map((m) => `• ${m.label}`).join('\n')); return; }
    const ok = await submit();
    Alert.alert(
      ok ? 'Регистрация завершена' : 'Сохранено локально',
      ok ? 'Анкета отправлена в Talentslab. Добро пожаловать в Divergents!' : 'Нет связи с Talentslab — данные сохранены в приложении и отправятся позже.',
      [{ text: 'В приложение', onPress: enter }],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <View style={{ width: 64 }} />
        <Text style={[ty.headline, { color: T.label }]}>Регистрация · {completeness}%</Text>
        <Pressable onPress={enter} hitSlop={8} style={{ width: 64, alignItems: 'flex-end' }}><Text style={[ty.body, { color: T.brandAccent }]}>Позже</Text></Pressable>
      </View>

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
            <View>
              <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Шаг {step + 1} из {total}</Text>
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
                Тесты Gallup, MBTI и Гарднера проходятся на Talentslab — после обработки результаты появятся в разделе «Карьера».
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {step > 0 ? <PrimaryButton label="Назад" color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} /> : null}
          {last ? (
            <PrimaryButton label="Завершить" icon="checkmark" loading={submitting} style={{ flex: 2 }} onPress={finish} />
          ) : (
            <PrimaryButton label="Далее" icon="arrow.right" style={{ flex: 2 }} onPress={next} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
