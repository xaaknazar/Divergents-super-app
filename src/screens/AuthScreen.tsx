import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { SF } from '../components/SFIcon';
import { PrimaryButton, ty } from '../components/ui';
import { Logo } from '../components/Logo';
import { RootStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParams, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!isLoaded || !email.trim()) return;
    setBusy(true); setError(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
      if (!factor) throw new Error('Для этой почты недоступен вход по коду');
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      setStep('code');
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || e?.message || 'Не удалось отправить код. Проверьте почту.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!isLoaded || !code.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await signIn.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        navigation.goBack();
      } else {
        setError('Не удалось войти. Попробуйте ещё раз.');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || 'Неверный код. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.systemBg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 10, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ alignSelf: 'flex-start', padding: 6 }}>
          <SF name="xmark" size={22} color={T.labelSecondary} />
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 28 }}>
          <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <Logo size={46} />
          </View>
          <Text style={[ty.title1, { color: T.label, marginTop: 16 }]}>Вход в Divergents</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4, textAlign: 'center' }]}>
            {step === 'email' ? 'Войдите по почте, чтобы увидеть свои курсы' : `Код отправлен на ${email}`}
          </Text>
        </View>

        {step === 'email' ? (
          <>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.labelTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
              style={[ty.body, { backgroundColor: T.fillTertiary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, color: T.label }]}
              onSubmitEditing={sendCode}
              returnKeyType="next"
            />
            {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 10, marginLeft: 4 }]}>{error}</Text> : null}
            <PrimaryButton label="Получить код" loading={busy} style={{ marginTop: 18 }} onPress={sendCode} />
          </>
        ) : (
          <>
            <Text style={[ty.footnote, { color: T.labelSecondary, marginBottom: 6, marginLeft: 4 }]}>КОД ИЗ ПИСЬМА</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={T.labelTertiary}
              keyboardType="number-pad"
              autoFocus
              style={[ty.title2, { backgroundColor: T.fillTertiary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, color: T.label, letterSpacing: 6, textAlign: 'center' }]}
              onSubmitEditing={verify}
              returnKeyType="done"
            />
            {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 10, marginLeft: 4 }]}>{error}</Text> : null}
            <PrimaryButton label="Войти" loading={busy} style={{ marginTop: 18 }} onPress={verify} />
            <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={[ty.body, { color: T.brandAccent }]}>Изменить почту</Text>
            </Pressable>
          </>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}
