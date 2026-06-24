import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { SF } from '../components/SFIcon';
import { ty } from '../components/ui';
import { Logo } from '../components/Logo';
import { RootStackParams } from '../navigation/types';
import { useAppFlow } from '../state/AppFlowContext';
import { useLang } from '../state/LanguageContext';

type Props = NativeStackScreenProps<RootStackParams, 'Auth'>;

export function AuthScreen({}: Props) {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, setLang, t } = useLang();
  const { signIn, setActive: setActiveSignIn, isLoaded: siLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: suLoaded } = useSignUp();
  const isLoaded = siLoaded && suLoaded;
  const { startRegistration, finishRegistration } = useAppFlow();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [intent, setIntent] = useState<'in' | 'up'>('in');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  const [left, setLeft] = useState(0); // resend countdown
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const prepSignIn = async () => {
    const attempt = await signIn!.create({ identifier: email.trim() });
    const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
    if (!factor) throw new Error('no_email_code');
    await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
    setMode('in');
  };
  const prepSignUp = async () => {
    await signUp!.create({ emailAddress: email.trim() });
    await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
    startRegistration();
    setMode('up');
  };

  const sendCode = async () => {
    if (!isLoaded || !email.trim()) return;
    setBusy(true); setError(null); setInfo(null);
    try {
      if (intent === 'in') {
        try { await prepSignIn(); }
        catch (e: any) {
          if (e?.errors?.[0]?.code === 'form_identifier_not_found') { await prepSignUp(); setInfo(t('note_new')); }
          else throw e;
        }
      } else {
        try { await prepSignUp(); }
        catch (e: any) {
          const c = e?.errors?.[0]?.code;
          if (c === 'form_identifier_exists' || c === 'form_email_address_exists') { await prepSignIn(); setInfo(t('note_exists')); }
          else throw e;
        }
      }
      setCode(''); setLeft(30); setStep('code');
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || t('err_generic'));
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!isLoaded || busy || left > 0) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'in') {
        const f = signIn!.supportedFirstFactors?.find((x: any) => x.strategy === 'email_code') as any;
        if (f) await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f.emailAddressId });
      } else { await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' }); }
      setLeft(30);
    } catch (e: any) { setError(e?.errors?.[0]?.message || t('err_generic')); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!isLoaded || code.trim().length < 4) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'in') {
        const res = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
        if (res.status === 'complete') { finishRegistration(); await setActiveSignIn!({ session: res.createdSessionId }); }
        else setError(t('err_code'));
      } else {
        const res = await signUp!.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === 'complete') { await setActiveSignUp!({ session: res.createdSessionId }); }
        else if (res.status === 'missing_requirements') {
          const miss = [...(res.missingFields ?? []), ...(res.unverifiedFields ?? [])].join(', ');
          setError(`Регистрация требует доп. полей в Clerk: ${miss || 'неизвестно'}. Оставьте обязательным только email.`);
        } else setError(t('err_code'));
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || t('err_code'));
    } finally { setBusy(false); }
  };

  const auroraTop = isDark ? ['rgba(35,64,136,0.35)', 'rgba(35,64,136,0)'] : ['rgba(35,64,136,0.14)', 'rgba(35,64,136,0)'];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <LinearGradient colors={auroraTop as any} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 16 }}>
          {/* Language switcher */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 11, padding: 3 }}>
              {(['ru', 'en'] as const).map((l) => {
                const on = lang === l;
                return (
                  <Pressable key={l} onPress={() => setLang(l)} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? T.cardBg : 'transparent', shadowColor: '#000', shadowOpacity: on ? 0.1 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
                    <Text style={[ty.footnoteEm, { color: on ? T.label : T.labelSecondary }]}>{l === 'ru' ? 'РУС' : 'ENG'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Hero */}
          <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 22 }}>
            <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: T.brandTinted, alignItems: 'center', justifyContent: 'center', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
              <Logo size={50} />
            </View>
            <Text style={[ty.largeTitle, { color: T.label, marginTop: 18 }]}>{t('welcome')}</Text>
            <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 8 }]}>{t('auth_sub')}</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: T.cardBg, borderRadius: 22, padding: 18, borderWidth: 0.5, borderColor: T.cardBorder, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
            {step === 'email' ? (
              <>
                {/* Segmented intent */}
                <View style={{ flexDirection: 'row', backgroundColor: T.fillSecondary, borderRadius: 13, padding: 4, marginBottom: 18 }}>
                  {(['in', 'up'] as const).map((k) => {
                    const on = intent === k;
                    return (
                      <Pressable key={k} onPress={() => { setIntent(k); setError(null); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: on ? T.cardBg : 'transparent', shadowColor: '#000', shadowOpacity: on ? 0.1 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
                        <Text style={[ty.subheadEm, { color: on ? T.brand : T.labelSecondary }]}>{k === 'in' ? t('tab_signin') : t('tab_signup')}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 7, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{t('email')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.fillTertiary, borderRadius: 14, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: focus ? T.brand : 'transparent' }}>
                  <SF name="envelope.fill" size={17} color={focus ? T.brand : T.labelTertiary} />
                  <TextInput
                    value={email} onChangeText={setEmail}
                    onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                    placeholder={t('email_ph')} placeholderTextColor={T.labelTertiary}
                    autoCapitalize="none" keyboardType="email-address" autoCorrect={false} autoFocus
                    style={[ty.body, { flex: 1, color: T.label, paddingVertical: 0 }]}
                    onSubmitEditing={sendCode} returnKeyType="go"
                  />
                  {email.length > 0 ? <Pressable onPress={() => setEmail('')} hitSlop={8}><SF name="xmark.circle.fill" size={17} color={T.labelTertiary} /></Pressable> : null}
                </View>

                {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 10, marginLeft: 2 }]}>{error}</Text> : null}

                <GradientButton label={t('cont')} icon="arrow.right" loading={busy} onPress={sendCode} T={T} style={{ marginTop: 16 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                  <SF name="lock.open.fill" size={12} color={T.labelTertiary} />
                  <Text style={[ty.caption1, { color: T.labelTertiary }]}>{t('passwordless')}</Text>
                </View>
              </>
            ) : (
              <>
                <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 14 }}>
                  <SF name="chevron.left" size={15} color={T.brandAccent} />
                  <Text style={[ty.body, { color: T.brandAccent }]}>{t('change_email')}</Text>
                </Pressable>

                <Text style={[ty.title3, { color: T.label }]}>{t('code_title')}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{t('code_sent')} <Text style={[ty.subheadEm, { color: T.label }]}>{email}</Text></Text>
                {info ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, backgroundColor: T.brandTinted, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12 }}>
                    <SF name={mode === 'up' ? 'person.badge.plus' : 'checkmark.circle.fill'} size={14} color={T.brand} />
                    <Text style={[ty.caption1, { color: T.brand, flex: 1 }]}>{info}</Text>
                  </View>
                ) : null}

                {/* OTP boxes */}
                <Pressable onPress={() => otpRef.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const ch = code[i] ?? '';
                    const active = i === code.length;
                    return (
                      <View key={i} style={{ width: 46, height: 56, borderRadius: 13, backgroundColor: T.fillTertiary, borderWidth: 1.5, borderColor: ch ? T.brand : active ? T.brandAccent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[ty.title2, { color: T.label }]}>{ch}</Text>
                      </View>
                    );
                  })}
                </Pressable>
                <TextInput ref={otpRef} value={code} onChangeText={(t2) => setCode(t2.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" autoFocus maxLength={6}
                  style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} onSubmitEditing={verify} />

                {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 12, marginLeft: 2 }]}>{error}</Text> : null}

                <GradientButton label={mode === 'up' ? t('verify_up') : t('verify_in')} icon="checkmark" loading={busy} onPress={verify} T={T} style={{ marginTop: 18 }} />

                <Pressable onPress={resend} disabled={left > 0 || busy} style={{ alignItems: 'center', marginTop: 16 }}>
                  <Text style={[ty.subhead, { color: left > 0 ? T.labelTertiary : T.brandAccent }]}>
                    {left > 0 ? `${t('resend_in')} 0:${left.toString().padStart(2, '0')}` : t('resend')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {step === 'email' ? (
            <Pressable onPress={() => Alert.alert(t('recover'), t('recover_body'), [{ text: t('ok') }])} style={{ alignItems: 'center', marginTop: 18 }}>
              <Text style={[ty.subhead, { color: T.brandAccent }]}>{t('recover')}</Text>
            </Pressable>
          ) : null}

          <View style={{ flex: 1 }} />
          <Text style={[ty.caption2, { color: T.labelTertiary, textAlign: 'center', paddingHorizontal: 16 }]}>{t('terms')}</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function GradientButton({ label, icon, loading, onPress, T, style }: { label: string; icon?: any; loading?: boolean; onPress: () => void; T: any; style?: any }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={style}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loading ? 0.7 : 1, shadowColor: T.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
        <Text style={[ty.headline, { color: '#fff' }]}>{label}</Text>
        {icon && !loading ? <SF name={icon} size={16} color="#fff" /> : null}
      </LinearGradient>
    </Pressable>
  );
}
