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

export const RU2EN: Record<string, string> = {"Закрыть": "Close", "Отмена": "Cancel", "Готово": "Done", "Изменить": "Edit", "Удалить": "Delete", "Заменить": "Replace", "Копировать": "Copy", "Прочитать": "Read", "Подробнее": "Details", "Поделиться": "Share", "Сообщить": "Report", "Купить курс": "Buy course", "Открыть на сайте": "Open on website", "Открыть на карте": "Open on map", "Смотреть бесплатный урок": "Watch free lesson", "Отправить отзыв": "Send review", "Отправить заявку": "Send application", "Подать заявку": "Apply", "Войти в челлендж": "Join challenge", "Добавить фото": "Add photo", "Разрешить отслеживание шагов": "Allow step tracking", "Сообщество": "Community", "Карьера": "Career", "Профиль": "Profile", "Каталог": "Catalog", "Места": "Places", "Достижения": "Achievements", "Уведомления": "Notifications", "Персонализация": "Personalization", "Активный челлендж": "Active challenge", "Личные данные": "Personal data", "Карьера и образование": "Career & education", "О себе": "About me", "Отчёты": "Reports", "Категории и баллы": "Categories & points", "Правила": "Rules", "Календарь": "Calendar", "Вакансии": "Vacancies", "Все поездки": "All trips", "Открыт набор": "Open enrollment", "Спортивные активности": "Sport activities", "Бесплатно": "Free", "Курс открыт": "Course unlocked", "Урок по подписке": "Subscription lesson", "Предпросмотр": "Preview", "Программа курса": "Course program", "Программа готовится": "Program in preparation", "О курсе": "About the course", "Что входит": "What's included", "Что включено": "What's included", "Ваш прогресс": "Your progress", "Демо-урок без видео": "Demo lesson without video", "Материалов к этому уроку нет": "No materials for this lesson", "Заметок к уроку пока нет": "No lesson notes yet", "Обсуждения пока нет. Будьте первым!": "No discussion yet. Be the first!", "Написать комментарий…": "Write a comment…", "Купите курс на сайте, чтобы открыть все уроки": "Buy the course on the website to unlock all lessons", "Полный доступ открывается после покупки": "Full access unlocks after purchase", "Уроки этого курса скоро появятся здесь.": "Lessons for this course will appear here soon.", "Нет курсов": "No courses", "В этой категории пока пусто. Выберите другую.": "This category is empty. Choose another.", "Категории": "Categories", "О вакансии": "About the role", "Требования": "Requirements", "Опыт работы": "Work experience", "Организатор": "Organizer", "Почему вам подходит": "Why it fits you", "Совпадение": "Match", "Тип личности (MBTI)": "Personality type (MBTI)", "Множественный интеллект (Гарднер)": "Multiple intelligence (Gardner)", "демо-данные": "demo data", "ВЫБЕРИТЕ КОМАНДУ": "CHOOSE A TEAM", "Заявка": "Application", "Заявка отправлена!": "Application sent!", "Заявок": "Applications", "ОТСЛЕЖИВАНИЕ АКТИВНОСТИ": "ACTIVITY TRACKING", "Пересчёт активности в шаги": "Activity-to-steps conversion", "Длительность": "Duration", "Старт": "Start", "О поездке": "About the trip", "Что включено ": "What's included", "Приложение будет считать шаги и, при наличии, подключится к вашим часам (Apple Watch / Google Fit) для авто-учёта активности.": "The app will count steps and, if available, connect to your watch (Apple Watch / Google Fit) to track activity automatically.", "Я ознакомился с правилами: 20 страниц, без сахара, 10 000 шагов и отчёт до 23:00. 3 🚩 — вылет.": "I have read the rules: 20 pages, no sugar, 10,000 steps and a report by 23:00. 3 🚩 — elimination.", "3 пропуска (🚩) — вылет": "3 misses (🚩) — elimination", "дней до старта": "days to start", "Общий": "General", "Тема": "Topic", "Акцентный цвет": "Accent color", "Фон": "Background", "Так выглядит ваша тема": "This is how your theme looks", "Настройте тему, акцент и фон под себя": "Customize theme, accent and background", "Чип": "Chip", "Кнопка": "Button", "Смотреть все достижения": "View all achievements", "Место не найдено": "Place not found", "Чем хорошо": "What's good", "Пока нет отзывов — оставь первый.": "No reviews yet — be the first.", "Ваш отзыв": "Your review", "Чем понравилось / что улучшить": "What you liked / what to improve", "НАЗВАНИЕ": "NAME", "КАТЕГОРИЯ": "CATEGORY", "ОСОБЕННОСТИ": "FEATURES", "ЧЕМ ХОРОШО": "WHAT'S GOOD", "ЧАСЫ РАБОТЫ": "OPENING HOURS", "ФОТО": "PHOTO", "напр. 09:00–23:00": "e.g. 09:00–23:00", "напр. Aknazar": "e.g. Aknazar", "напр. Coffee BOOM": "e.g. Coffee BOOM", "напр. Вкусный колд брю, тихо, есть розетки": "e.g. Great cold brew, quiet, power outlets", "НИКНЕЙМ (до 9 символов, близкий к ФИО)": "NICKNAME (up to 9 chars, close to your name)", "Никнейм должен быть от 1 до 9 символов": "Nickname must be 1 to 9 characters", "Уведомлений пока нет": "No notifications yet", "оплата на divergents-lms.kz": "payment on divergents-lms.kz", "единоразово": "one-time", "Далее": "Next", "Назад": "Back", "Сохранить": "Save", "Завершить": "Finish", "Позже": "Later", "Шаг": "Step", "из": "of", "Регистрация": "Registration", "Анкета": "Profile", "Войти в приложение": "Enter the app", "Регистрация завершена": "Registration complete", "Заполненность анкеты Talentslab": "Talentslab profile completeness", "Заполните обязательные поля": "Fill in the required fields", "Анкета заполнена полностью.": "Profile is fully completed.", "Продолжить заполнение можно в разделе «Карьера».": "You can continue in the Career section.", "Анкета сохранена в Talentslab. Заполните её до 100%, чтобы пройти Gallup, MBTI и тест Гарднера.": "Profile saved to Talentslab. Complete it to 100% to take Gallup, MBTI and the Gardner test.", "Анкета сохранена": "Profile saved", "Сохранено локально": "Saved locally", "Данные отправлены в Talentslab.": "Data sent to Talentslab.", "Нет связи с Talentslab — данные сохранены в приложении и отправятся позже.": "No connection to Talentslab — saved on device and will be sent later.", "км": "km", "м": "m", "мин": "min", "ч": "h", "дн": "d", "дн.": "d", "дней": "days", "по прямой": "as the crow flies", "ждём GPS…": "waiting for GPS…", "ищу самый быстрый маршрут…": "finding the fastest route…", "самый быстрый": "fastest", "Откуда:": "From:", "от меня": "from me", "Вести сюда": "Go here", "Детали": "Details", "Навигатор": "Navigator", "Выберите город": "Choose a city", "Поиск адресов…": "Searching addresses…", "Точка на карте": "Point on map", "Точка А": "Point A", "Маршрут сюда": "Route here", "Маршрут отсюда": "Route from here", "Добавить место здесь": "Add a place here", "Отзывы": "Reviews", "отзывов · добавил": "reviews · added by", "В избранном": "Saved", "В избранное": "Save", "Не удалось загрузить курс. Проверьте подключение.": "Couldn't load the course. Check your connection.", "Курс не найден.": "Course not found.", "Уроков": "Lessons", "Пройдено": "Completed", "Урок": "Lesson", "Продолжить": "Continue", "Начать курс": "Start course", "видеоуроков": "video lessons", "Материалы и конспекты": "Materials and notes", "Обсуждение с участниками": "Discussion with members", "Доступ на 1 год": "1-year access", "Смотреть бесплатно": "Watch for free", "Откроется после покупки": "Unlocks after purchase", "Курсов": "Courses", "В работе": "In progress", "Завершено": "Done", "завершено": "completed", "Заметки": "Notes", "Материалы": "Materials", "Обсуждение": "Discussion", "Урок завершён ✓": "Lesson completed ✓", "Завершить урок": "Finish lesson", "Найдено": "Found", "Все курсы": "All courses", "Все": "All", "Привет": "Hi", "курсов · non-stop development": "courses · non-stop development", "Подобраны по вашему психотипу и талантам": "Matched to your type and talents", "Мои отклики": "My applications", "Отправлен": "Sent", "Ещё подходящие": "More matches", "Ничего не найдено": "Nothing found", "Моя анкета": "My profile", "Дополните профиль для точного подбора": "Complete your profile for better matches", "Заполните анкету — подберём роли по талантам": "Complete the profile — we'll match roles to your talents", "Редактировать анкету": "Edit profile", "Заполнить анкету": "Fill the profile", "Лучшее совпадение": "Best match", "ваших таланта": "of your talents", "Отклик отправлен": "Application sent", "Откликнуться": "Apply", "Отклик отправлен ✓": "Application sent ✓", "Таланты Gallup для роли · совпадает": "Gallup talents for the role · matches", "Город": "City", "Телефон": "Phone", "Дата рождения": "Date of birth", "Пол": "Gender", "Семейное положение": "Marital status", "Гражданство": "Citizenship", "Готовность к переезду": "Relocation", "Да": "Yes", "Желаемая должность": "Desired position", "Сфера": "Field", "Опыт (лет)": "Experience (yrs)", "Ожидания по зарплате": "Salary expectations", "Языки": "Languages", "Компьютерные навыки": "Computer skills", "Образование": "Education", "Хобби": "Hobbies", "Интересы": "Interests", "Спорт": "Sport", "Страны": "Countries", "Книг в год": "Books per year", "Права": "Driver's license", "Есть": "Yes", "Тип личности": "Personality type", "Таланты Gallup": "Gallup talents", "категории": "categories", "вылет": "elimination", "Капитан:": "Captain:", "советники:": "advisors:", "набрана": "full", "нужно": "need", "человек": "people", "День закрыт! Серия": "Day done! Streak", "День": "Day", "участников": "members", "Дней": "Days", "Прогресс": "Progress", "Очки команды": "Team points", "Команды · нужно ещё": "Teams · need", "Сегодня · день": "Today · day", "место": "place", "Команда": "Team", "Серия": "Streak", "Очки": "Points", "Место": "Place", "заявок": "applications", "через": "in", "Идут": "Going", "Мест": "Spots", "Стоимость": "Price", "Маршрут": "Route", "Вы записаны ✓": "You're in ✓", "Записаться": "Join", "поездка Divergents": "Divergents trip", "сложность:": "difficulty:", "Вы идёте": "You're going", "Участвую": "Join", "Капитан команды": "Team captain", "рассмотрит вашу заявку на": "will review your application for", "С вами свяжутся в Telegram перед стартом": "You'll be contacted on Telegram before the start", "капитан": "captain", "Согласен с правилами": "I agree to the rules", "Канал не найден": "Channel not found", "Пост не найден": "Post not found", "Не указано": "Not specified", "Редактировать": "Edit", "Новое место": "New place", "Добавить место": "Add place", "Город:": "City:", "нажмите на карту, чтобы поставить точку": "tap the map to drop a pin", "Отчёты Gallup и тест Гарднера загружаются на сайте Talentslab — после обработки они появятся в разделе «Карьера».": "Gallup reports and the Gardner test are uploaded on the Talentslab website — after processing they appear in the Career section.", "Регистрация требует доп. полей в Clerk:": "Sign-up requires extra fields in Clerk:", "неизвестно": "unknown", "Оставьте обязательным только email.": "Keep only email required.", "До": "To", "ещё": "more", "сегодня": "today", "включая": "incl.", "бонусных": "bonus", "Бонусы за превышение нормы идут команде.": "Bonus over the daily minimum goes to the team."};

let _lang: Lang = 'ru';
export function tr(ru: string): string { return _lang === 'en' ? (RU2EN[ru] ?? ru) : ru; }

interface LangState { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof STR) => string; tr: (ru: string) => string; }
const Ctx = createContext<LangState | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(systemDefault());
  _lang = lang;
  useEffect(() => { SecureStore.getItemAsync(KEY).then((v) => { if (v === 'en' || v === 'ru') setLangState(v); }).catch(() => {}); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); SecureStore.setItemAsync(KEY, l).catch(() => {}); }, []);
  const t = useCallback((k: keyof typeof STR) => (STR[k] ? STR[k][lang] : String(k)), [lang]);
  const tr = useCallback((ru: string) => (lang === 'en' ? (RU2EN[ru] ?? ru) : ru), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, tr }), [lang, setLang, t, tr]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang must be used within LanguageProvider');
  return c;
}
