import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, LayoutAnimation } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { RESUME_STEPS } from '../../data/resumeSchema';
import { ResumeFieldInput } from '../../components/ResumeField';
import { useResume } from '../../state/useResume';
import { useLang, tr } from '../../state/LanguageContext';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'Resume'>;

export function ResumeFormScreen({ navigation }: Props) {
  const { T } = useTheme();
  useLang();
  const insets = useSafeAreaInsets();
  const { answers, setField, completeness, submit, submitting } = useResume();
  const [step, setStep] = useState(0);
  const total = RESUME_STEPS.length;
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  const go = (n: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(n); };

  // Don't allow submitting an empty resume — require at least the name.
  const nameFilled = typeof answers.full_name === 'string' && answers.full_name.trim().length > 0;

  const finish = async () => {
    if (!nameFilled) {
      Alert.alert(
        tr('Заполните анкету'),
        tr('Укажите хотя бы ФИО, чтобы сохранить анкету.'),
        [{ text: tr('Готово'), onPress: () => go(0) }],
      );
      return;
    }
    const ok = await submit();
    // Truthful messaging: there is no automatic retry/queue. On success the data
    // is in Talentslab; on failure it stays saved locally and the user can open
    // the form and tap "Сохранить" again to retry.
    Alert.alert(
      ok ? tr('Анкета сохранена') : tr('Сохранено в приложении'),
      ok
        ? tr('Данные отправлены в Talentslab.')
        : tr('Нет связи с Talentslab. Анкета сохранена в приложении — откройте её и нажмите «Сохранить» ещё раз, когда появится связь.'),
      [{ text: tr('Готово'), onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>{tr('Закрыть')}</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>{tr('Анкета')} · {completeness}%</Text>
        <View style={{ width: 56 }} />
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
            <View>
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
                {tr('Отчёты Gallup и тест Гарднера загружаются на сайте Talentslab — после обработки они появятся в разделе «Карьера».')}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {step > 0 ? (
            <PrimaryButton label={tr('Назад')} color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} />
          ) : null}
          {last ? (
            <PrimaryButton label={tr('Сохранить')} icon="checkmark" loading={submitting} disabled={!nameFilled} style={{ flex: 2 }} onPress={finish} />
          ) : (
            <PrimaryButton label={tr('Далее')} icon="arrow.right" style={{ flex: 2 }} onPress={() => go(step + 1)} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
