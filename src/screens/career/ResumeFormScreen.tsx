import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, LayoutAnimation } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SF } from '../../components/SFIcon';
import { PrimaryButton, ty } from '../../components/ui';
import { RESUME_STEPS, ResumeField } from '../../data/resumeSchema';
import { useResume } from '../../state/useResume';
import { CareerStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<CareerStackParams, 'Resume'>;

export function ResumeFormScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setField, completeness, submit, submitting } = useResume();
  const [step, setStep] = useState(0);
  const total = RESUME_STEPS.length;
  const s = RESUME_STEPS[step];
  const last = step === total - 1;

  const go = (n: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setStep(n); };

  const finish = async () => {
    const ok = await submit();
    Alert.alert(
      ok ? 'Анкета сохранена' : 'Сохранено локально',
      ok ? 'Данные отправлены в Talentslab.' : 'Нет связи с Talentslab — данные сохранены в приложении и отправятся позже.',
      [{ text: 'Готово', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Text style={[ty.body, { color: T.brandAccent }]}>Закрыть</Text></Pressable>
        <Text style={[ty.headline, { color: T.label }]}>Анкета · {completeness}%</Text>
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
              <Text style={[ty.caption2Em, { color: T.labelSecondary, textTransform: 'uppercase' }]}>Шаг {step + 1} из {total}</Text>
              <Text style={[ty.title3, { color: T.label }]}>{s.title}</Text>
            </View>
          </View>

          {s.fields.map((f) => (
            <Field key={f.key} field={f} value={answers[f.key]} onChange={(v) => setField(f.key, v)} />
          ))}

          {s.key === 'assessments' ? (
            <View style={{ marginTop: 8, backgroundColor: T.brandTinted, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10 }}>
              <SF name="doc.fill" size={18} color={T.brand} />
              <Text style={[ty.caption1, { color: T.label, flex: 1 }]}>
                Отчёты Gallup и тест Гарднера загружаются на сайте Talentslab — после обработки они появятся в разделе «Карьера».
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
          {step > 0 ? (
            <PrimaryButton label="Назад" color="transparent" style={{ flex: 1 }} onPress={() => go(step - 1)} />
          ) : null}
          {last ? (
            <PrimaryButton label="Сохранить" icon="checkmark" loading={submitting} style={{ flex: 2 }} onPress={finish} />
          ) : (
            <PrimaryButton label="Далее" icon="arrow.right" style={{ flex: 2 }} onPress={() => go(step + 1)} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ field, value, onChange }: { field: ResumeField; value: any; onChange: (v: any) => void }) {
  const { T } = useTheme();
  const [tag, setTag] = useState('');
  const labelEl = (
    <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>
      {field.label.toUpperCase()}{field.optional ? '' : ' *'}
    </Text>
  );
  const inputStyle = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label };

  if (field.type === 'bool') {
    const on = value === true;
    return (
      <Pressable onPress={() => onChange(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.cardBg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <Text style={[ty.body, { color: T.label, flex: 1 }]}>{field.label}</Text>
        <SF name={on ? 'checkmark.circle.fill' : 'circle'} size={24} color={on ? T.brand : T.labelTertiary} />
      </Pressable>
    );
  }

  if (field.type === 'select') {
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {field.options!.map((opt) => {
            const on = value === opt;
            return (
              <Pressable key={opt} onPress={() => onChange(opt)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                <Text style={[ty.footnoteEm, { color: on ? '#fff' : T.label }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  if (field.type === 'tags') {
    const tags: string[] = Array.isArray(value) ? value : [];
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={tag} onChangeText={setTag} placeholder={field.placeholder} placeholderTextColor={T.labelTertiary}
            style={[ty.body, { ...inputStyle, flex: 1 }]} onSubmitEditing={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} returnKeyType="done" />
          <Pressable onPress={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} hitSlop={6}>
            <SF name="plus.circle.fill" size={30} color={T.brand} />
          </Pressable>
        </View>
        {tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {tags.map((tg, i) => (
              <Pressable key={i} onPress={() => onChange(tags.filter((_, j) => j !== i))} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.brandTinted }}>
                <Text style={[ty.footnoteEm, { color: T.brand }]}>{tg}</Text>
                <SF name="xmark" size={11} color={T.brand} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  // text / textarea / number
  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={(t) => onChange(field.type === 'number' ? t.replace(/[^0-9]/g, '') : t)}
        placeholder={field.placeholder}
        placeholderTextColor={T.labelTertiary}
        keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
        multiline={field.type === 'textarea'}
        autoCapitalize={field.key === 'email' || field.key === 'instagram' ? 'none' : 'sentences'}
        style={[ty.body, inputStyle, field.type === 'textarea' ? { minHeight: 90, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}
