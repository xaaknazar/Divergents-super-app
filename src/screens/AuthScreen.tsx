import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import { SF } from '../components/SFIcon';
import { Logo } from '../components/Logo';
import { RootStackParams } from '../navigation/types';
import { API_BASE } from '../data/api';
import { useAppFlow } from '../state/AppFlowContext';
import { useLang, tr } from '../state/LanguageContext';

type Props = NativeStackScreenProps<RootStackParams, 'Auth'>;

const TERMS_URL = `${API_BASE}/terms`;
const PRIVACY_URL = `${API_BASE}/privacy`;
const openUrl = (url: string) => { WebBrowser.openBrowserAsync(url).catch(() => {}); };

// Нужно для Clerk SSO: корректно закрывает web-браузер после возврата в приложение.
WebBrowser.maybeCompleteAuthSession();

// Clerk returns English developer-facing messages. Map the known error codes to
// user text; anything unknown falls back to the caller's generic Russian text
// (never surface the raw English message).
const CLERK_ERRORS: Record<string, string> = {
  form_identifier_not_found: 'Аккаунт с такой почтой не найден. Проверьте адрес или зарегистрируйтесь.',
  form_identifier_exists: 'Аккаунт с такой почтой уже есть — войдите.',
  form_email_address_exists: 'Аккаунт с такой почтой уже есть — войдите.',
  form_param_format_invalid: 'Проверьте формат адреса электронной почты.',
  form_param_nil: 'Введите адрес электронной почты.',
  form_code_incorrect: 'Неверный код. Проверьте письмо и попробуйте ещё раз.',
  verification_failed: 'Неверный код. Проверьте письмо и попробуйте ещё раз.',
  verification_expired: 'Код устарел. Запросите новый код.',
  verification_already_verified: 'Почта уже подтверждена — нажмите «Подтвердить».',
  too_many_requests: 'Слишком много попыток. Подождите немного и попробуйте снова.',
  session_exists: 'Вы уже вошли в аккаунт. Перезапустите приложение.',
  identifier_already_signed_in: 'Вы уже вошли в аккаунт. Перезапустите приложение.',
  network_error: 'Нет соединения. Проверьте интернет и попробуйте снова.',
  oauth_access_denied: 'Вход отменён.',
  oauth_callback_invalid: 'Не удалось завершить вход. Попробуйте ещё раз.',
  user_locked: 'Аккаунт временно заблокирован. Попробуйте позже.',
  form_identifier_not_allowed: 'Эта почта не может быть использована для входа.',
};
function clerkErrorText(e: any, fallback: string): string {
  const code = e?.errors?.[0]?.code as string | undefined;
  if (code && CLERK_ERRORS[code]) return CLERK_ERRORS[code];
  if (code || e?.errors?.[0]?.message) console.warn('[auth] clerk error', code, e?.errors?.[0]?.message);
  return fallback;
}
const SIGNUP_UNAVAILABLE = 'Регистрация временно недоступна. Попробуйте позже.';

export function AuthScreen({}: Props) {
  const { T, isDark, ty } = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, setLang, t } = useLang();
  const { signIn, setActive: setActiveSignIn, isLoaded: siLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: suLoaded } = useSignUp();
  const isLoaded = siLoaded && suLoaded;
  const { startRegistration, finishRegistration } = useAppFlow();
  const { startSSOFlow } = useSSO();

  // Вход через Google/Apple. Полностью минует email-код. `sso` держит активного
  // провайдера, чтобы показать спиннер именно на нажатой кнопке.
  const [sso, setSso] = useState<null | 'oauth_google' | 'oauth_apple'>(null);
  const onSSO = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (busy) return;
    setBusy(true); setSso(strategy); setError(null); setInfo(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'divergents', path: 'sso-callback' });
      const { createdSessionId, setActive } = await startSSOFlow({ strategy, redirectUrl });
      if (createdSessionId && setActive) { finishRegistration(); await setActive({ session: createdSessionId }); }
      else setError(t('err_generic'));
    } catch (e: any) {
      setError(clerkErrorText(e, t('err_generic')));
    } finally { setBusy(false); setSso(null); }
  };

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

  const sendCode = async (forceIntent?: 'in' | 'up') => {
    if (!isLoaded || !email.trim()) return;
    // `recover()` flips intent and calls this synchronously, so the closure's
    // `intent` is still stale — accept an explicit override.
    const useIntent = forceIntent ?? intent;
    setBusy(true); setError(null); setInfo(null);
    try {
      if (useIntent === 'in') {
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
      setError(clerkErrorText(e, t('err_generic')));
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!isLoaded || busy || left > 0) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'in') {
        const f = signIn!.supportedFirstFactors?.find((x: any) => x.strategy === 'email_code') as any;
        if (f) await signIn!.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f.emailAddressId });
        setLeft(30);
      } else {
        // Can't resend a code to an already-verified email — finish if possible,
        // otherwise tell the user to just enter the code they already received.
        try { await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' }); setLeft(30); }
        catch (e: any) {
          if (isAlreadyVerified(e)) {
            if (!(await activateComplete())) setError(tr('Почта уже подтверждена — введите код из письма и нажмите «Подтвердить».'));
          } else throw e;
        }
      }
    } catch (e: any) { setError(clerkErrorText(e, t('err_generic'))); }
    finally { setBusy(false); }
  };

  // Clerk's "already verified" — the email was verified on a previous attempt
  // (double-tap, or after a resend). Match by error code or message.
  const isAlreadyVerified = (e: any) => {
    const err = e?.errors?.[0];
    const c = err?.code || '';
    const msg = `${err?.message ?? ''} ${err?.longMessage ?? ''}`.toLowerCase();
    return c === 'verification_already_verified' || c === 'already_verified' || (msg.includes('already') && msg.includes('verif'));
  };
  // If the sign-up is actually finished, activate its session — this unsticks the
  // "already verified" dead-end whenever email is the only sign-up requirement.
  const activateComplete = async (): Promise<boolean> => {
    try {
      if (signUp?.status === 'complete' && signUp.createdSessionId) { await setActiveSignUp!({ session: signUp.createdSessionId }); return true; }
    } catch {}
    return false;
  };

  const verify = async () => {
    if (!isLoaded || busy || code.trim().length !== 6) return;
    setBusy(true); setError(null);
    try {
      // A wrong code throws (caught below); a non-'complete' status here means
      // the code was accepted but Clerk needs a further step (2FA / extra
      // fields) — so we must NOT mislabel it as «Неверный код».
      const needMore = lang === 'ru'
        ? 'Код принят, но нужен дополнительный шаг подтверждения. Свяжитесь с поддержкой.'
        : 'Code accepted, but an extra verification step is required. Please contact support.';
      if (mode === 'in') {
        const res = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
        if (res.status === 'complete') { finishRegistration(); await setActiveSignIn!({ session: res.createdSessionId }); }
        else setError(needMore);
      } else {
        let res;
        try { res = await signUp!.attemptEmailAddressVerification({ code: code.trim() }); }
        catch (e: any) {
          // Email already verified earlier → finish if we can; otherwise it's a
          // Clerk config issue (sign-up needs more than email).
          if (isAlreadyVerified(e)) {
            if (await activateComplete()) return;
            const miss = [...((signUp as any)?.missingFields ?? []), ...((signUp as any)?.unverifiedFields ?? [])].join(', ');
            // Config problem (sign-up requires more than email) — developer detail
            // goes to the log, the user gets plain text.
            console.warn('[auth] sign-up already verified but incomplete; missing fields:', miss || 'none');
            setError(miss ? SIGNUP_UNAVAILABLE : tr('Почта уже подтверждена, но вход не завершился — обновите приложение или свяжитесь с поддержкой.'));
            return;
          }
          throw e;
        }
        if (res.status === 'complete') { await setActiveSignUp!({ session: res.createdSessionId }); }
        else if (res.status === 'missing_requirements') {
          const miss = [...(res.missingFields ?? []), ...(res.unverifiedFields ?? [])].join(', ');
          console.warn('[auth] sign-up missing_requirements; fields:', miss || 'unknown');
          setError(SIGNUP_UNAVAILABLE);
        } else setError(needMore);
      }
    } catch (e: any) {
      setError(clerkErrorText(e, t('err_code')));
    } finally { setBusy(false); }
  };

  // Auto-submit once all 6 digits are in (iOS OTP autofill pastes them at once).
  // The ref guards against re-submitting the same code after an error re-render.
  const autoSubmitRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'code' || code.length !== 6 || busy) return;
    if (autoSubmitRef.current === code) return;
    autoSubmitRef.current = code;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  // Passwordless "forgot" path: there is no password to reset — recovery just
  // means sending a fresh sign-in code. If the email is filled we send it right
  // away; otherwise we prompt the user to enter their email first.
  const recover = () => {
    setError(null);
    if (!email.trim()) { setInfo(t('recover_body')); return; }
    setIntent('in'); setInfo(null);
    sendCode('in');
  };

  const auroraTop = isDark ? ['rgba(35,64,136,0.35)', 'rgba(35,64,136,0)'] : ['rgba(35,64,136,0.14)', 'rgba(35,64,136,0)'];

  return (
    <View style={{ flex: 1, backgroundColor: T.systemBg }}>
      <LinearGradient colors={auroraTop as any} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 20 }}>
            <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: T.cardBg, borderWidth: 0.5, borderColor: T.cardBorder, alignItems: 'center', justifyContent: 'center', shadowColor: T.brand, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
              <Logo size={50} />
            </View>
            <Text style={[ty.largeTitle, { color: T.label, marginTop: 18, textAlign: 'center' }]}>{t('welcome')}</Text>
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
                      <Pressable
                        key={k}
                        onPress={() => { setIntent(k); setError(null); }}
                        accessibilityRole="radio"
                        accessibilityLabel={k === 'in' ? t('tab_signin') : t('tab_signup')}
                        accessibilityState={{ selected: on }}
                        style={{ flex: 1, minHeight: 48, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? T.cardBg : 'transparent', shadowColor: '#000', shadowOpacity: on ? 0.1 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
                      >
                        <Text style={[ty.subheadEm, { color: on ? T.brand : T.labelSecondary, textAlign: 'center' }]}>{k === 'in' ? t('tab_signin') : t('tab_signup')}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[ty.caption2Em, { color: T.labelSecondary, marginBottom: 7, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{t('email')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.fillTertiary, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, minHeight: 54, borderWidth: 1.5, borderColor: focus ? T.brand : 'transparent' }}>
                  <SF name="envelope.fill" size={17} color={focus ? T.brand : T.labelTertiary} />
                  <TextInput
                    value={email} onChangeText={setEmail}
                    onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                    placeholder={t('email_ph')} placeholderTextColor={T.labelTertiary}
                    autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
                    textContentType="emailAddress" autoComplete="email"
                    accessibilityLabel={t('email')}
                    style={[ty.body, { flex: 1, color: T.label, minHeight: 38, paddingVertical: 6 }]}
                    onSubmitEditing={() => sendCode()} returnKeyType="go"
                  />
                  {email.length > 0 ? (
                    <Pressable
                      onPress={() => setEmail('')}
                      accessibilityRole="button"
                      accessibilityLabel={lang === 'ru' ? 'Очистить адрес электронной почты' : 'Clear email address'}
                      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <SF name="xmark.circle.fill" size={17} color={T.labelTertiary} />
                    </Pressable>
                  ) : null}
                </View>

                {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 10, marginLeft: 2 }]}>{error}</Text> : null}
                {!error && info ? <Text style={[ty.footnote, { color: T.brandAccent, marginTop: 10, marginLeft: 2 }]}>{info}</Text> : null}

                <GradientButton label={t('cont')} icon="arrow.right" loading={busy} disabled={!isLoaded || !email.trim()} onPress={() => sendCode()} T={T} style={{ marginTop: 16 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingHorizontal: 4 }}>
                  <SF name="lock.open.fill" size={12} color={T.labelTertiary} />
                  <Text style={[ty.caption1, { color: T.labelTertiary, flexShrink: 1, textAlign: 'center' }]}>{t('passwordless')}</Text>
                </View>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: T.separator }} />
                  <Text style={[ty.caption1, { color: T.labelTertiary }]}>{lang === 'ru' ? 'или' : 'or'}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: T.separator }} />
                </View>

                {/* Google — real multi-colour logo, spinner on the pressed button */}
                <Pressable onPress={() => onSSO('oauth_google')} disabled={busy || !isLoaded}
                  accessibilityRole="button"
                  accessibilityLabel={lang === 'ru' ? 'Войти через Google' : 'Continue with Google'}
                  accessibilityState={{ disabled: busy || !isLoaded, busy: sso === 'oauth_google' }}
                  style={{ marginTop: 14, minHeight: 54, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 15, borderWidth: 1, borderColor: T.cardBorder, backgroundColor: T.cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: (busy && sso !== 'oauth_google') || !isLoaded ? 0.5 : 1 }}>
                  {sso === 'oauth_google' ? <ActivityIndicator size="small" color={T.label} /> : <GoogleG size={20} />}
                  <Text style={[ty.headline, { color: T.label, flexShrink: 1, textAlign: 'center' }]}>{lang === 'ru' ? 'Войти через Google' : 'Continue with Google'}</Text>
                </Pressable>

                {/* Apple (iOS) */}
                {Platform.OS === 'ios' ? (
                  <Pressable onPress={() => onSSO('oauth_apple')} disabled={busy || !isLoaded}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'ru' ? 'Войти через Apple' : 'Continue with Apple'}
                    accessibilityState={{ disabled: busy || !isLoaded, busy: sso === 'oauth_apple' }}
                    // HIG: black button in light appearance, white with black content in dark.
                    style={{ marginTop: 10, minHeight: 54, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 15, backgroundColor: isDark ? '#FFFFFF' : '#000000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: (busy && sso !== 'oauth_apple') || !isLoaded ? 0.5 : 1 }}>
                    {sso === 'oauth_apple' ? <ActivityIndicator size="small" color={isDark ? '#000000' : '#FFFFFF'} /> : <SF name="applelogo" size={18} color={isDark ? '#000000' : '#FFFFFF'} />}
                    <Text style={[ty.headline, { color: isDark ? '#000000' : '#FFFFFF', flexShrink: 1, textAlign: 'center' }]}>{lang === 'ru' ? 'Войти через Apple' : 'Continue with Apple'}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} accessibilityRole="button" accessibilityLabel={t('change_email')} style={{ minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8 }}>
                  <SF name="chevron.left" size={15} color={T.brandAccent} />
                  <Text style={[ty.body, { color: T.brandAccent, flexShrink: 1 }]}>{t('change_email')}</Text>
                </Pressable>

                <Text style={[ty.title3, { color: T.label }]}>{t('code_title')}</Text>
                <Text style={[ty.subhead, { color: T.labelSecondary, marginTop: 4 }]}>{t('code_sent')} <Text style={[ty.subheadEm, { color: T.label }]}>{email}</Text></Text>
                {info ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, backgroundColor: T.brandTinted, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12 }}>
                    <SF name={mode === 'up' ? 'person.badge.plus' : 'checkmark.circle.fill'} size={14} color={T.brand} />
                    <Text style={[ty.caption1, { color: T.brand, flex: 1 }]}>{info}</Text>
                  </View>
                ) : null}

                {/* OTP boxes. The cells are purely visual; the real TextInput is laid
                    over them (near-transparent, caret hidden) so it is the single
                    accessible element: VoiceOver reads its label + typed count, a
                    tap anywhere on the row focuses it, and iOS OTP autofill works. */}
                <View style={{ position: 'relative', marginTop: 18 }}>
                  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 6 }}>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const ch = code[i] ?? '';
                      const active = i === code.length;
                      return (
                        <View key={i} style={{ flex: 1, maxWidth: 46, minHeight: 56, borderRadius: 13, backgroundColor: T.fillTertiary, borderWidth: 1.5, borderColor: ch ? T.brand : active ? T.brandAccent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={[ty.title2, { color: T.label }]}>{ch}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <TextInput
                    ref={otpRef}
                    value={code}
                    onChangeText={(t2) => setCode(t2.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    caretHidden
                    contextMenuHidden
                    accessibilityLabel={lang === 'ru' ? 'Код из письма' : 'Code from the email'}
                    accessibilityHint={lang === 'ru' ? 'Введите 6 цифр' : 'Enter 6 digits'}
                    accessibilityValue={{ text: lang === 'ru' ? `Введено ${code.length} из 6 цифр` : `${code.length} of 6 digits entered` }}
                    onSubmitEditing={verify}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1 }}
                  />
                </View>

                {error ? <Text style={[ty.footnote, { color: T.red, marginTop: 12, marginLeft: 2 }]}>{error}</Text> : null}

                <GradientButton label={mode === 'up' ? t('verify_up') : t('verify_in')} icon="checkmark" loading={busy} disabled={code.length !== 6} onPress={verify} T={T} style={{ marginTop: 18 }} />

                <Pressable onPress={resend} disabled={left > 0 || busy} accessibilityRole="button" accessibilityLabel={t('resend')} accessibilityState={{ disabled: left > 0 || busy }} style={{ minHeight: 48, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                  <Text style={[ty.subhead, { color: left > 0 ? T.labelTertiary : T.brandAccent, textAlign: 'center' }]}>
                    {left > 0 ? `${t('resend_in')} 0:${left.toString().padStart(2, '0')}` : t('resend')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {step === 'email' ? (
            <Pressable onPress={recover} disabled={busy} accessibilityRole="button" accessibilityLabel={t('recover')} accessibilityState={{ disabled: busy }} style={{ minHeight: 48, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <Text style={[ty.subhead, { color: T.brandAccent, textAlign: 'center' }]}>{t('recover')}</Text>
            </Pressable>
          ) : null}

          {/* Spacer pins the terms to the bottom when the content is short, yet
              lets everything scroll when the card is tall (SSO buttons on small
              screens). */}
          <View style={{ flex: 1, minHeight: 24 }} />
          <Text style={[ty.caption2, { color: T.labelTertiary, textAlign: 'center', paddingHorizontal: 16, marginTop: 20 }]}>{t('terms')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 6 }}>
            <Pressable onPress={() => openUrl(TERMS_URL)} accessibilityRole="link" accessibilityLabel={lang === 'ru' ? 'Условия использования' : 'Terms of Service'} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[ty.caption2Em, { color: T.brandAccent, textAlign: 'center' }]}>{lang === 'ru' ? 'Условия использования' : 'Terms of Service'}</Text>
            </Pressable>
            <Text style={[ty.caption2, { color: T.labelTertiary }]}>·</Text>
            <Pressable onPress={() => openUrl(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel={lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[ty.caption2Em, { color: T.brandAccent, textAlign: 'center' }]}>{lang === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Official multi-colour Google "G" (viewBox 48). Recognisable on light or dark
// buttons, so it reads correctly in both themes.
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
}

function GradientButton({ label, icon, loading, disabled, onPress, T, style }: { label: string; icon?: any; loading?: boolean; disabled?: boolean; onPress: () => void; T: any; style?: any }) {
  const { ty } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={loading || disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: loading || disabled, busy: loading }} style={style}>
      <LinearGradient colors={[T.brand, T.brandAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ minHeight: 54, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: loading || disabled ? 0.5 : 1, shadowColor: T.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : (
          <>
            <Text style={[ty.headline, { color: '#fff', flexShrink: 1, textAlign: 'center' }]}>{label}</Text>
            {icon ? <SF name={icon} size={16} color="#fff" /> : null}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}
