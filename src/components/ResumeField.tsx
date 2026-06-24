import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, Pressable, TextInput } from 'react-native';
import { SF } from './SFIcon';
import { ty } from './ui';
import { ResumeField } from '../data/resumeSchema';

export function ResumeFieldInput({ field, value, onChange }: { field: ResumeField; value: any; onChange: (v: any) => void }) {
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

  return (
    <View style={{ marginBottom: 14 }}>
      {labelEl}
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={(t) => onChange(field.type === 'number' ? t.replace(/[^0-9]/g, '') : t)}
        placeholder={field.placeholder}
        placeholderTextColor={T.labelTertiary}
        keyboardType={field.key === 'phone' ? 'phone-pad' : field.type === 'number' ? 'number-pad' : field.key === 'email' ? 'email-address' : 'default'}
        multiline={field.type === 'textarea'}
        autoCapitalize={field.key === 'email' || field.key === 'instagram' ? 'none' : 'sentences'}
        style={[ty.body, inputStyle, field.type === 'textarea' ? { minHeight: 90, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}
