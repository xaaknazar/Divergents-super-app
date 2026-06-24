// Lightweight i18n: RU/EN with a small dictionary. Persisted on-device.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';

export type Lang = 'ru' | 'en';
const KEY = 'dvg.lang';

type Dict = Record<string, { ru: string; en: string }>;

export const STR: Dict = {
  welcome: { ru: 'Добро пожаловать', en: 'Welcome' },
  auth_sub: { ru: 'Один аккаунт для обучения, сообщества и карьеры Divergents.', en: 'One account for Divergents learning, community and career.' },
  tab_signin: { ru: 'Вход', en: 'Sign in' },
  tab_signup: { ru: 'Регистрация', en: 'Sign up' },
  email: { ru: 'Почта', en: 'Email' },
  email_ph: { ru: 'you@example.com', en: 'you@example.com' },
  cont: { ru: 'Продолжить', en: 'Continue' },
  passwordless: { ru: 'Без пароля — отправим код на почту', en: 'Passwordless — we’ll email you a code' },
  recover: { ru: 'Не получается войти?', en: 'Trouble signing in?' },
  recover_body: { ru: 'Divergents использует вход по коду — пароль не нужен. Введите свою почту и нажмите «Продолжить», мы пришлём новый код для входа.', en: 'Divergents uses code sign-in — no password needed. Enter your email and tap Continue, we’ll send a fresh code.' },
  ok: { ru: 'Понятно', en: 'Got it' },
  code_title: { ru: 'Введите код', en: 'Enter the code' },
  code_sent: { ru: 'Код отправлен на', en: 'Code sent to' },
  verify_in: { ru: 'Войти', en: 'Sign in' },
  verify_up: { ru: 'Подтвердить и продолжить', en: 'Verify & continue' },
  change_email: { ru: 'Изменить почту', en: 'Change email' },
  resend: { ru: 'Отправить код снова', en: 'Resend code' },
  resend_in: { ru: 'Новый код через', en: 'Resend in' },
  note_new: { ru: 'Аккаунта нет — создаём новый.', en: 'No account yet — creating a new one.' },
  note_exists: { ru: 'Аккаунт уже есть — выполняем вход.', en: 'Account exists — signing you in.' },
  err_generic: { ru: 'Не удалось отправить код. Проверьте почту.', en: 'Couldn’t send the code. Check your email.' },
  err_code: { ru: 'Неверный код. Попробуйте ещё раз.', en: 'Invalid code. Try again.' },
  err_signup: { ru: 'Не удалось начать регистрацию.', en: 'Couldn’t start sign-up.' },
  terms: { ru: 'Продолжая, вы соглашаетесь с условиями и политикой конфиденциальности Divergents.', en: 'By continuing you agree to Divergents Terms and Privacy Policy.' },
};

interface LangState { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof STR) => string; }
const Ctx = createContext<LangState | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');
  useEffect(() => { SecureStore.getItemAsync(KEY).then((v) => { if (v === 'en' || v === 'ru') setLangState(v); }).catch(() => {}); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); SecureStore.setItemAsync(KEY, l).catch(() => {}); }, []);
  const t = useCallback((k: keyof typeof STR) => (STR[k] ? STR[k][lang] : String(k)), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang must be used within LanguageProvider');
  return c;
}
