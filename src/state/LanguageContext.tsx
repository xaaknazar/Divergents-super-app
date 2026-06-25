// Lightweight i18n: RU/EN. Default follows device locale on first launch, then
// the user's explicit choice (persisted). t(key) returns the active string.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';

export type Lang = 'ru' | 'en';
const KEY = 'dvg.lang';

function systemDefault(): Lang {
  try { return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en'; } catch { return 'ru'; }
}

type Pair = { ru: string; en: string };
export const STR: Record<string, Pair> = {
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

  tab_learn: { ru: 'Обучение', en: 'Learn' },
  tab_ai: { ru: 'AI', en: 'AI' },
  tab_community: { ru: 'Сообщество', en: 'Community' },
  tab_map: { ru: 'Карта', en: 'Map' },
  tab_career: { ru: 'Карьера', en: 'Career' },
  tab_profile: { ru: 'Профиль', en: 'Profile' },

  all: { ru: 'Все', en: 'All' },
  back: { ru: 'Назад', en: 'Back' },
  next: { ru: 'Далее', en: 'Next' },
  start: { ru: 'Начать', en: 'Get started' },
  save: { ru: 'Сохранить', en: 'Save' },
  cancel: { ru: 'Отмена', en: 'Cancel' },

  ob1_t: { ru: 'Ваш профиль — ключ', en: 'Your profile is the key' },
  ob1_b: { ru: 'Загрузите отчёты Gallup, MBTI и Gardner — и приложение подстроится под ваши таланты.', en: 'Add your Gallup, MBTI and Gardner results — the app adapts to your talents.' },
  ob2_t: { ru: 'AI-наставник рядом', en: 'An AI mentor by your side' },
  ob2_b: { ru: 'Персональный ассистент знает ваш психотип и даёт точечные советы по курсам, книгам и карьере.', en: 'A personal assistant who knows your type and gives tailored advice on courses, books and career.' },
  ob3_t: { ru: 'Сообщество своих', en: 'Your community' },
  ob3_b: { ru: '21-дневные челленджи, поездки и встречи с людьми, разделяющими ваши ценности.', en: '21-day challenges, trips and meetups with people who share your values.' },
  ob4_t: { ru: 'Работа по психотипу', en: 'Work that fits your type' },
  ob4_b: { ru: 'Карьера ищет совпадение по талантам и ценностям, а не только по резюме.', en: 'Career matches by talents and values, not just a résumé.' },

  profile: { ru: 'Профиль', en: 'Profile' },
  questionnaire: { ru: 'анкета', en: 'profile' },
  achievements_n: { ru: 'Достижения', en: 'Achievements' },
  view_all_ach: { ru: 'Смотреть все достижения', en: 'View all achievements' },
  strengths: { ru: 'Сильные стороны · CliftonStrengths', en: 'Strengths · CliftonStrengths' },
  demo_refresh: { ru: 'демо · обновить', en: 'demo · refresh' },
  account: { ru: 'Аккаунт', en: 'Account' },
  signed_in: { ru: 'Вы вошли', en: 'Signed in' },
  signout: { ru: 'Выйти', en: 'Sign out' },
  continue_: { ru: 'Продолжить', en: 'Continue' },
  continue_learning: { ru: 'Продолжить обучение', en: 'Continue learning' },
  in_progress_1: { ru: 'курс в работе', en: 'course in progress' },
  in_progress_n: { ru: 'курса в работе', en: 'courses in progress' },
  personal_data: { ru: 'Личные данные', en: 'Personal data' },
  career_education: { ru: 'Карьера и образование', en: 'Career & education' },
  about_me: { ru: 'О себе', en: 'About me' },
  reports: { ru: 'Отчёты', en: 'Reports' },
  active_challenge: { ru: 'Активный челлендж', en: 'Active challenge' },
  applications_n: { ru: 'Отклики на вакансии', en: 'Job applications' },
  sent_: { ru: 'Отправлен', en: 'Sent' },
  appearance: { ru: 'Внешний вид', en: 'Appearance' },
  personalization: { ru: 'Персонализация', en: 'Personalization' },
  personalization_sub: { ru: 'Тема, акцентный цвет, фон', en: 'Theme, accent color, background' },
  language: { ru: 'Язык', en: 'Language' },

  community: { ru: 'Сообщество', en: 'Community' },
  community_tagline: { ru: 'Divergents · свои люди и общий рост', en: 'Divergents · your people, shared growth' },
  sec_home: { ru: 'Главная', en: 'Home' },
  sec_channels: { ru: 'Каналы', en: 'Channels' },
  sec_challenges: { ru: 'Челленджи', en: 'Challenges' },
  sec_trips: { ru: 'Поездки', en: 'Trips' },
  sec_sport: { ru: 'Спорт', en: 'Sport' },
  channels_of_community: { ru: 'Каналы сообщества', en: 'Community channels' },
  subscribers: { ru: 'подписчиков', en: 'subscribers' },
  subscribe_group: { ru: 'Вступить в группу', en: 'Join group' },
  subscribed: { ru: 'Вы подписаны', en: 'Subscribed' },
  request_access: { ru: 'Запросить доступ', en: 'Request access' },
  request_pending: { ru: 'Запрос на рассмотрении', en: 'Request pending' },
  access_paid: { ru: 'Доступ оплачен', en: 'Access paid' },
  by_request: { ru: 'по запросу', en: 'by request' },
  publications: { ru: 'Публикации', en: 'Posts' },
  closed_channel: { ru: 'Закрытый канал · по запросу', en: 'Private channel · by request' },
  paid_label: { ru: 'Платный', en: 'Paid' },
  check_status: { ru: 'Проверить статус запроса', en: 'Check request status' },
  pay_access: { ru: 'Оплатить', en: 'Pay' },
  request_approved: { ru: 'Запрос одобрен', en: 'Request approved' },
  paid_closed_channel: { ru: 'Платный закрытый канал', en: 'Paid private channel' },
  access_by_request_title: { ru: 'Доступ по запросу', en: 'Access by request' },
  locked_request_body: { ru: 'Это закрытый канал. Отправьте запрос, чтобы видеть публикации.', en: 'This is a private channel. Send a request to see posts.' },
  locked_pending_body: { ru: 'Модератор рассмотрит ваш запрос и откроет доступ к публикациям.', en: 'A moderator will review your request and grant access.' },
  pay_flow_title: { ru: 'Оплата доступа', en: 'Pay for access' },
  paid_pay_now: { ru: 'оплатите доступ, чтобы открыть публикации канала.', en: 'pay for access to unlock the channel posts.' },
  paid_after_approve: { ru: 'Модератор рассмотрит запрос. После одобрения откроется оплата.', en: 'A moderator will review the request. Payment opens after approval.' },
  paid_first_request: { ru: 'Сначала отправьте запрос. После одобрения — оплата.', en: 'Send a request first. Payment opens after approval.' },
  paid_iv_paid: { ru: 'Я оплатил(а)', en: 'I have paid' },
  audio: { ru: 'Аудио', en: 'Audio' },
  article: { ru: 'Статья', en: 'Article' },
  min_read: { ru: 'мин чтения', en: 'min read' },
  views_: { ru: 'просмотров', en: 'views' },
  listens_: { ru: 'прослушиваний', en: 'plays' },
  your_challenge: { ru: 'Твой челлендж', en: 'Your challenge' },
  upcoming_trips: { ru: 'Предстоящие поездки', en: 'Upcoming trips' },
  open_: { ru: 'Открыть', en: 'Open' },
  search_course: { ru: 'Поиск курса', en: 'Search course' },
  my_courses: { ru: 'Мои курсы', en: 'My courses' },
  recommended: { ru: 'Рекомендуем', en: 'Recommended' },
  not_found_title: { ru: 'Курсы не найдены', en: 'No courses found' },
  not_found_sub: { ru: 'Попробуйте изменить запрос или категорию.', en: 'Try a different query or category.' },
  demo_mode: { ru: 'Демо-режим · нет связи с сайтом', en: 'Demo mode · no server connection' },
  vacancies: { ru: 'Вакансии', en: 'Vacancies' },
  map_search_ph: { ru: 'Поиск: место, адрес, здание', en: 'Search: place, address, building' },
  car: { ru: 'Авто', en: 'Car' },
  walk: { ru: 'Пешком', en: 'Walk' },
  recent_: { ru: 'Недавние', en: 'Recent' },
};

interface LangState { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof STR) => string; }
const Ctx = createContext<LangState | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(systemDefault());
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
