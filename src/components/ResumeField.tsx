import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, TextInput } from 'react-native';
import { SF } from './SFIcon';
import { minTouch } from '../theme/tokens';
import { ResumeField } from '../data/resumeSchema';

export function ResumeFieldInput({ field, value, onChange }: { field: ResumeField; value: any; onChange: (v: any) => void }) {
  const { T, ty } = useTheme();
  const [tag, setTag] = useState('');
  const labelId = `resume-field-${field.key}`;
  const accessibilityLabel = `${field.label}${field.optional ? '' : ', обязательное поле'}`;
  const labelEl = (
    <Text nativeID={labelId} style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>
      {field.label.toUpperCase()}{field.optional ? '' : ' *'}
    </Text>
  );
  const inputStyle = { backgroundColor: T.cardBg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: T.label };

  if (field.type === 'bool') {
    // Explicit Да/Нет so "No" (false) is a real answer, distinct from
    // "not answered yet" (undefined). Otherwise a single checkbox makes
    // "No" indistinguishable from "unanswered" and blocks the resume gate.
    const opts: [string, boolean][] = [['Да', true], ['Нет', false]];
    return (
      <View style={{ marginBottom: 14 }}>
        {labelEl}
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', gap: 8 }}>
          {opts.map(([lbl, val]) => {
            const on = value === val;
            return (
              <Pressable key={lbl} onPress={() => onChange(val)} accessibilityRole="radio" accessibilityLabel={lbl} accessibilityState={{ checked: on }}
                style={{ flex: 1, minHeight: minTouch, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                <Text style={[ty.footnoteEm, { color: on ? T.onBrand : T.label }]}>{lbl}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
              <Pressable key={opt} onPress={() => onChange(opt)} accessibilityRole="radio" accessibilityLabel={`${field.label}: ${opt}`} accessibilityState={{ checked: on }}
                style={{ minHeight: minTouch, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? T.brand : T.cardBg, borderWidth: 0.5, borderColor: on ? 'transparent' : T.separator }}>
                <Text style={[ty.footnoteEm, { color: on ? T.onBrand : T.label }]}>{opt}</Text>
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
            accessibilityLabel={accessibilityLabel} accessibilityLabelledBy={labelId}
            style={[ty.body, { ...inputStyle, flex: 1 }]} onSubmitEditing={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} returnKeyType="done" />
          <Pressable onPress={() => { if (tag.trim()) { onChange([...tags, tag.trim()]); setTag(''); } }} disabled={!tag.trim()}
            accessibilityRole="button" accessibilityLabel={`Добавить: ${field.label}`} accessibilityState={{ disabled: !tag.trim() }}
            style={{ width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' }}>
            <SF name="plus.circle.fill" size={30} color={T.brandText} />
          </Pressable>
        </View>
        {tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {tags.map((tg, i) => (
              <Pressable key={i} onPress={() => onChange(tags.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Удалить ${tg}`}
                style={{ minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.brandTinted }}>
                <Text style={[ty.footnoteEm, { color: T.brandText }]}>{tg}</Text>
                <SF name="xmark" size={11} color={T.brandText} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={(t) => onChange(field.type === 'number' ? t.replace(/[^0-9]/g, '') : t)}
        placeholder={field.placeholder}
        placeholderTextColor={T.labelTertiary}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={labelId}
        keyboardType={field.key === 'phone' ? 'phone-pad' : field.type === 'number' ? 'number-pad' : field.key === 'email' ? 'email-address' : 'default'}
        multiline={field.type === 'textarea'}
        autoCapitalize={field.key === 'email' || field.key === 'instagram' ? 'none' : 'sentences'}
        style={[ty.body, inputStyle, field.type === 'textarea' ? { minHeight: 90, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}
