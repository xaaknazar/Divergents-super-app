// One-time nickname gate. Users who registered BEFORE nicknames existed are
// asked for one on their next launch — the app shows a public псевдоним instead
// of a full name everywhere, so it cannot be empty. There is no skip, but the
// screen is a single short field (not the whole anketa).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Logo } from '../components/Logo';
import { PrimaryButton, ty } from '../components/ui';
import { SF } from '../components/SFIcon';
import { useResume } from '../state/useResume';
import { NICKNAME_HINT, NICKNAME_MAX, nicknameError, sanitizeNickname } from '../data/nickname';
import { checkNicknameAvailable, getTalentslabToken } from '../data/talentslab';
import { useAuth } from '@clerk/clerk-expo';

export function NicknameGateScreen() {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setField, submit, submitting } = useResume();
  const { getToken } = useAuth();
  const [value, setValue] = useState(typeof answers.nickname === 'string' ? answers.nickname : '');
  const [touched, setTouched] = useState(false);
  // Server-side uniqueness: псевдоним должен быть свободен. null = не проверено
  // (нет сети) — тогда финальную проверку делает сервер при сохранении.
  const [taken, setTaken] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const reqIdRef = useRef(0);

  const formatError = nicknameError(value);

  // Debounced availability check while typing.
  useEffect(() => {
    if (formatError) { setTaken(null); setChecking(false); return; }
    const id = ++reqIdRef.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      const token = await getTalentslabToken(getToken);
      const available = await checkNicknameAvailable(token, value.trim());
      if (reqIdRef.current !== id) return; // устарел
      setTaken(available === null ? null : !available);
      setChecking(false);
    }, 450);
    return () => { clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatError]);

  const error = formatError ?? (taken ? 'Этот псевдоним уже занят — придумайте другой' : null);
  const showError = (touched || taken === true) && !!error;

  const save = async () => {
    setTouched(true);
    if (error || checking) return;
    setField('nickname', value.trim());
    // Persist to Talentslab. The server is the final authority on uniqueness —
    // if somebody took the handle in the meantime the save is rejected, so we
    // re-check and say exactly what happened instead of silently staying here.
    const ok = await submit();
    if (!ok) {
      const token = await getTalentslabToken(getToken);
      const available = await checkNicknameAvailable(token, value.trim());
      if (available === false) {
        setTaken(true);
        Alert.alert('Псевдоним занят', 'Кто-то уже выбрал этот псевдоним. Придумайте другой.');
      } else {
        Alert.alert('Не удалось сохранить', 'Проверьте подключение и попробуйте снова.');
      }
    }
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
            <Text style={[ty.title2, { color: T.label, textAlign: 'center' }]}>Напишите псевдоним</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', marginTop: 8 }]}>
              Он будет виден другим участникам вместо вашего имени — в сообществе, челленджах и каналах. Псевдоним уникален: занять чужой нельзя.
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
            {checking ? <ActivityIndicator size="small" color={T.labelTertiary} />
              : <SF name={showError ? 'xmark.circle.fill' : taken === false ? 'checkmark.circle.fill' : 'checkmark.seal.fill'} size={13}
                  color={showError ? T.red : taken === false ? T.green : T.labelTertiary} />}
            <Text style={[ty.caption1, { color: showError ? T.red : taken === false ? T.green : T.labelTertiary, flex: 1 }]}>
              {checking ? 'Проверяем, свободен ли псевдоним…'
                : showError ? error
                : taken === false ? 'Псевдоним свободен'
                : NICKNAME_HINT}
            </Text>
          </View>

          <View style={{ height: 22 }} />
          <PrimaryButton
            label="Сохранить и продолжить"
            icon="checkmark"
            loading={submitting}
            disabled={!!error || submitting || checking}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
