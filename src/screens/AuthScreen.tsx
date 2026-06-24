import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { SF } from '../components/SFIcon';
import { PrimaryButton, ty } from '../components/ui';
import { Logo } from '../components/Logo';
import { RootStackParams } from '../navigation/types';
import { useAppFlow } from '../state/AppFlowContext';

type Props = NativeStackScreenProps<RootStackParams, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const isLoaded = signInLoaded && signUpLoaded;
  const { startRegistration } = useAppFlow();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [mode, setMode] = useState<'in' | 'up'>('in'); // resolved after entering email
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSignUp = async () => {
    await signUp!.create({ emailAddress: email.trim() });
    await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
    startRegistration(); // after verification the app shows the registration анкета
    setMode('up'); setStep('code');
  };

  // Enter email: try sign-in; if the account doesn't exist, start sign-up automatically.
  const sendCode = async () => {
    if (!isLoaded || !email.trim()) return;
    setBusy(true); setError(null);
    try {
      const attempt = await signIn!.create({ identifier: email.trim() });
      const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
      if (!factor) throw new Error('Для этой почты недоступен вход по коду');
      await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      setMode('in'); setStep('code');
    } catch (e: any) {
      const codeErr = e?.errors?.[0]?.code;
      if (codeErr === 'form_identifier_not_found') {
        try { await startSignUp(); }
        catch (e2: any) { setError(e2?.errors?.[0]?.message || 'Не удалось начать регистрацию.'); }
      } else {
        setError(e?.errors?.[0]?.message || e?.message || 'Не удалось отправить код. Проверьте почту.');
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!isLoaded || busy) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'in') {
        const factor = signIn!.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
        if (factor) await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
    } catch (e: any) { setError(e?.errors?.[0]?.message || 'Не удалось отправить код заново.'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!isLoaded || !code.trim()) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'in') {
        const res = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
        if (res.status === 'complete') { await setActiveSignIn!({ session: res.createdSessionId }); }
        else setError('Не удалось войти. Попробуйте ещё раз.');
      } else {
        const res = await signUp!.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === 'complete') { await setActiveSignUp!({ session: res.createdSessionId }); }
        else setError('Не удалось подтвердить почту. Попробуйте ещё раз.');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || 'Неверный код. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const title = step === 'email' ? 'Вход или регистрация' : mode === 'up' ? 'Подтвердите почту' : 'Вход в Divergents';
  const sub = step === 'email'
    ? 'Введите почту. Если аккаунта нет — пройдёте быструю регистрацию.'
    : mode === 'up' ? `Код для подтверждения отправлен на ${email}` : `Код отправлен на ${email}`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.systemBg }}>
      <View style={{ flex: 1, paddingTop: insets.top + 10, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 28 }}>
          <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center' }}>
            <Logo size={46} />
          </View>
          <Text style={[ty.title1, { color: T.label, marginTop: 16 }]}>{title}</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4, textAlign: 'center' }]}>{sub}</Text>
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
            <PrimaryButton label="Продолжить" loading={busy} style={{ marginTop: 18 }} onPress={sendCode} />
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
            <PrimaryButton label={mode === 'up' ? 'Подтвердить и продолжить' : 'Войти'} loading={busy} style={{ marginTop: 18 }} onPress={verify} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 }}>
              <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }}>
                <Text style={[ty.body, { color: T.brandAccent }]}>Изменить почту</Text>
              </Pressable>
              <Pressable onPress={resend} disabled={busy}>
                <Text style={[ty.body, { color: busy ? T.labelTertiary : T.brandAccent }]}>Отправить код снова</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
