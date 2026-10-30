import React from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { FieldError } from './FieldError';

/** One creation shell: fixed header, scrollable fields, reachable publish action. */
export function CreationFormLayout({ children, onCancel, onSubmit, busy = false, disabled = false, error }: {
  children: React.ReactNode; onCancel: () => void; onSubmit: () => void; busy?: boolean; disabled?: boolean; error?: string;
}) {
  const { T, ty } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
    <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.cardBg, borderBottomWidth: 0.5, borderBottomColor: T.separator }}>
      <Pressable onPress={onCancel} disabled={busy} accessibilityRole="button" accessibilityLabel="Отмена" accessibilityState={{ disabled: busy }}
        style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 8, justifyContent: 'center', flex: 1, opacity: busy ? 0.5 : pressed ? 0.6 : 1 })}>
        <Text style={[ty.body, { color: T.brandText }]}>Отмена</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[ty.headline, { color: T.label, textAlign: 'center', flex: 1 }]}>Создать</Text>
      <View style={{ flex: 1 }} />
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView pointerEvents={busy ? 'none' : 'auto'} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {children}
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: insets.bottom + 12, gap: 8, backgroundColor: T.cardBg, borderTopWidth: 0.5, borderTopColor: T.separator }}>
        <FieldError message={error} />
        <Button label="Опубликовать" icon="checkmark" loading={busy} disabled={disabled} onPress={onSubmit} />
      </View>
    </KeyboardAvoidingView>
  </View>;
}
