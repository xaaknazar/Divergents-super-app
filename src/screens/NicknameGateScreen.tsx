// One-time nickname gate. Users who registered BEFORE nicknames existed are
// asked for one on their next launch — the app shows a public псевдоним instead
// of a full name everywhere, so it cannot be empty. There is no skip, but the
// screen is a single short field (not the whole anketa).
import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Logo } from '../components/Logo';
import { PrimaryButton, ty } from '../components/ui';
import { SF } from '../components/SFIcon';
import { useResume } from '../state/useResume';
import { NICKNAME_HINT, NICKNAME_MAX, nicknameError, sanitizeNickname } from '../data/nickname';

export function NicknameGateScreen() {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setField, submit, submitting } = useResume();
  const [value, setValue] = useState(typeof answers.nickname === 'string' ? answers.nickname : '');
  const [touched, setTouched] = useState(false);

  const error = nicknameError(value);
  const showError = touched && !!error;

  const save = async () => {
    setTouched(true);
    if (error) return;
    setField('nickname', value.trim());
    // Persist to Talentslab; a failed sync keeps the local value and retries
    // later (useResume queues pending submits), so the user isn't stuck here.
    await submit();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.groupedBg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Logo size={34} body="#FFFFFF" head="#FFFFFF" />
            </View>
            <Text style={[ty.title2, { color: T.label, textAlign: 'center' }]}>Придумайте псевдоним</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', marginTop: 8 }]}>
              Он будет виден другим участникам вместо вашего имени — в сообществе, челленджах и каналах.
            </Text>
          </View>

          <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.4 }]}>Псевдоним</Text>
          <TextInput
            value={value}
            onChangeText={(v) => setValue(sanitizeNickname(v))}
            onBlur={() => setTouched(true)}
            placeholder="Например: Aknazar"
            placeholderTextColor={T.labelTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={NICKNAME_MAX}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Псевдоним"
            style={[ty.body, {
              backgroundColor: T.cardBg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
              color: T.label, borderWidth: 1, borderColor: showError ? T.red : T.cardBorder,
            }]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, marginLeft: 2 }}>
            <SF name={showError ? 'xmark.circle.fill' : 'checkmark.seal.fill'} size={13} color={showError ? T.red : T.labelTertiary} />
            <Text style={[ty.caption1, { color: showError ? T.red : T.labelTertiary, flex: 1 }]}>
              {showError ? error : NICKNAME_HINT}
            </Text>
          </View>

          <View style={{ height: 22 }} />
          <PrimaryButton
            label="Сохранить и продолжить"
            icon="checkmark"
            loading={submitting}
            disabled={!!error || submitting}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
