# Полный аудит Divergents Super App

**Дата:** 29 августа 2026  
**Объём:** 41 экран, 107 TypeScript-файлов, ~19 700 строк `src`  
**Метод:** статический review, дизайн-системный и WCAG-аудит, проверка архитектуры/логики, TypeScript, Expo Doctor, Metro export для iOS и Android, smoke-check публичных production API  
**Вердикт:** сборка работоспособна, но приложение **не готово к production release** до устранения P0 и ключевых P1.

## Executive summary

Сильная база уже есть: строгий TypeScript проходит, обе native-сборки Metro экспортируются, публичные API отвечают JSON, типографическая шкала почти повторяет iOS Dynamic Type, есть light/dark токены, safe areas, Reduce Motion/Transparency, Zod-контракты для LMS и продуманная offline-очередь челленджа.

Главный вывод по шрифтам: **базовые размеры в `tokens.ts` в основном правильные, но фактическое поведение текста — нет**. 10 pt подписи, 83 случая `adjustsFontSizeToFit`, фиксированные высоты, шестой таб, слабый контраст и дополнительный app-scale поверх системного font scale приводят к тексту 9–10 pt, обрезанию и поломке layout на accessibility-размерах.

До релиза критично:

1. закрыть утечку AI-истории, GPS-маршрутов и геолокации между аккаунтами;
2. добавить удаление аккаунта;
3. исправить контраст CTA для персонализированных акцентов и текстовые semantic colors;
4. перестроить масштабирование типографики и touch targets;
5. убрать ложные success-состояния в карьере/LMS;
6. настроить Android Maps key;
7. перенести объёмные данные из SecureStore;
8. добавить автоматические тесты и CI quality gates.

## Проверки работоспособности

| Проверка | Результат |
|---|---|
| `npm run typecheck` | PASS, 0 ошибок |
| Metro export iOS | PASS, 1 653 модуля, Hermes bundle 5.76 MB |
| Metro export Android | PASS, 1 651 модуль, Hermes bundle 5.77 MB |
| `npx expo-doctor` | FAIL: 17/18; 3 patch mismatch |
| Public API smoke | PASS: courses, challenges, trips, sport, channels, places, vacancies, books — HTTP 200 JSON |
| Автотесты | отсутствуют |
| Lint | отсутствует |
| E2E | отсутствует |

Expo Doctor требует синхронизировать:

- `expo` 54.0.36 → `~54.0.37`;
- `expo-constants` 18.0.13 → `~18.0.14`;
- `expo-file-system` 19.0.23 → `~19.0.24`.

Обе сборки подтверждают, что текущий код бандлится; это не доказывает работоспособность hardware-permissions, VoiceOver/TalkBack, HealthKit/Health Connect, карты и авторизованных API на реальных устройствах.

## P0 — release blockers

### 1. Локальные данные предыдущего аккаунта видны следующему

`clearAllAppData()` не очищает четыре user-scoped ключа:

- AI-история `ai.history.v1`: `src/screens/ai/AIChatScreen.tsx:29`, `:63-89`;
- GPS-треки `dvg.workouts.v1`: `src/state/ActivityContext.tsx:32`, `:49-58`;
- выбранная геолокация `dvg.placeLoc`: `src/state/PlacesContext.tsx:68-87`;
- порядок Gallup `dvg.gallup.order`: `src/data/talentslab.ts:268`.

Allowlist очистки находится в `src/state/reset.ts:14-50` и этих ключей не содержит. На общем устройстве account B может получить AI-переписку, маршруты и местоположение account A.

**Исправление:** единый реестр persistence keys с `scope: device | user`, миграция существующих данных, userId namespace и тест `account A → logout → account B`.

### 2. Нет удаления аккаунта

В профиле есть только logout (`src/screens/profile/ProfileHomeScreen.tsx:92-109`, `:300-307`). В клиенте нет `user.delete` или запроса удаления; `RELEASE-CHECKLIST.md:35` также оставляет `DELETE /api/mobile/me` незавершённым.

**Исправление:** подтверждение с повторной аутентификацией, server-side cascade delete/anonymization, Clerk account deletion, локальный wipe, отзыв push token, понятный success/error flow.

### 3. Персональный accent может сделать CTA нечитаемым

`PrimaryButton` всегда использует белый foreground (`src/components/ui.tsx:191-209`), но dark-theme accents включают светлые amber/emerald/teal/sky (`src/theme/personalization.ts:18-30`). Например белый на `#FBBF24` ≈ 1.7:1.

**Исправление:** добавить к каждой палитре вычисленный `onBrand`/`onAccent`; выбор `#111` или `#fff` должен гарантировать минимум 4.5:1 для текста и 3:1 для крупных UI-глифов.

### 4. Accessibility font size фактически нарушается

В проекте 83 `adjustsFontSizeToFit`, minimum scale опускается до 0.6–0.8. Например 15 pt может стать 9 pt (`src/components/talentUI.tsx:25`). Одновременно `Segmented`, buttons и chips имеют фиксированные высоты (`src/components/ui.tsx:151-165`, `:199-212`, `:243-257`).

**Исправление:** для текста заменить `height` на `minHeight`, разрешить 2 строки, оставить автоужатие только для второстепенных числовых метрик, тестировать 100/135/160/200%.

### 5. Основной challenge flow сломан на Android

Ручной ввод metric реализован только через iOS `Alert.prompt`; на Android `promptSet()` ничего не делает (`src/screens/community/ChallengeDetailScreen.tsx:414-423`). Для activity task `onAdjust` намеренно отсутствует (`:560-565`). Рабочий GPS-трекер зарегистрирован как route, но из UI к нему нет ни одного перехода (`src/navigation/index.tsx:86`). В результате Android-пользователь практически не может внести шаги — ключевую механику 21-дневного челленджа.

**Исправление:** доступный cross-platform numeric bottom sheet/input; явный CTA «Записать прогулку/пробежку» в challenge row; integration test Android `0 → set steps → sync → leaderboard`.

## P1 — major findings

### Типографика, UI и UX

1. **Таб-бар перегружен.** Шесть вкладок (`src/navigation/TabBar.tsx:13-20`) вынуждают подпись 10/13 и дополнительное ужатие (`:65-76`). Цель: максимум 5 top-level destinations; шестую перенести в «Ещё»/профиль.
2. **Светлая палитра текста не проходит WCAG AA.** На белом: `labelSecondary` ≈ 3.44:1, `labelTertiary` ≈ 1.72:1, `labelQuaternary` ≈ 1.37:1 (`src/theme/tokens.ts:23-27`). Для обычного текста требуется 4.5:1; 3:1 допустимо лишь для крупного текста. См. [W3C WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum).
3. **Semantic colors нельзя использовать как мелкий текст.** На белом текущие green ≈ 2.22:1, orange ≈ 2.20:1, red ≈ 3.55:1. Нужны отдельные `greenText`, `orangeText`, `redText`, более тёмные в light theme.
4. **10 pt нужно исключить.** Нарушения: tab labels (`src/navigation/TabBar.tsx:76`), Gardner labels/axis (`src/components/GardnerChart.tsx:138`, `:156`), map badge (`src/screens/map/MapHomeScreen.tsx:474`). Apple указывает 17 pt как default и 11 pt как минимум для iOS; custom light fonts требуют ещё большего запаса. См. [Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography).
5. **Кастомный app font scale мутирует глобальный объект.** `applyTextScale()` (`src/theme/tokens.ts:148-181`) ненадёжен для стилей, захваченных при импорте, и умножается на системный RN font scale. Нужен `useTypography()` и единая политика OS/app scaling.
6. **Spacing/radius tokens почти не управляют UI.** При наличии токенов (`src/theme/tokens.ts:184-188`) аудит обнаружил сотни hardcoded padding/gap/radius и много вариантов радиусов. Нужна миграция сначала атомов, затем экранов.
7. **Dark mode конфликтует с config.** `app.json:9` фиксирует `userInterfaceStyle: "light"`, хотя тема поддерживает system/dark.
8. **Terminology непоследовательна.** Смешаны `pts`/«баллы», AI/ИИ, английские названия. Нужен русский glossary и запрет raw user-facing strings вне `tr()`.

### Accessibility

Статическая инвентаризация: около 213 pressable controls, но только 65 `accessibilityLabel`, 48 `accessibilityRole`, 15 `accessibilityState`, 1 hint и 0 live region. Это не означает, что все остальные 148 кнопок полностью немые — текстовые children иногда дают автоматическое имя — но показывает отсутствие системной семантики.

1. Icon-only controls без label/role: downloads (`src/screens/lms/DownloadsScreen.tsx:227-270`), map controls (`src/screens/map/MapHomeScreen.tsx:374-381`, `:435-442`).
2. `NavRoundButton` допускает бессмысленное имя «Кнопка» (`src/components/NavHeader.tsx:48-65`).
3. Form labels визуально отделены от inputs и не связаны с ними (`src/components/ResumeField.tsx:11-16`, `:85-97`).
4. Custom vacancy publish switch не имеет role/state (`src/screens/career/CreateVacancyScreen.tsx:198-205`).
5. ProgressBar/seek bar не имеют role/value/actions (`src/components/ui.tsx:9-18`, `src/screens/lms/DownloadsScreen.tsx:293-306`).
6. 12 modal flows не задают `accessibilityViewIsModal`, initial focus и restore focus.
7. Touch targets ниже минимума: Segmented 32, chips ~32, actions 38/40. Для основного iOS interaction target Apple рекомендует 44×44 pt; см. [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) и [Apple Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons).

### Архитектура, privacy и storage

1. **SecureStore используется как база данных.** `saveJSON` сам предупреждает о ~2 KB, но глотает ошибки (`src/state/persist.ts:31-42`). Туда пишутся resume, до 24 AI messages и до 200 GPS polylines. Пользователь видит success, а после restart данные могут исчезнуть.
2. **Logout размножен.** Профиль отзывает push token, но Register/ResumeGate — нет. Нужен единый `signOutCoordinator`: unregister push → stop/cancel work → wipe user data → Clerk signOut.
3. **Публичный Talentslab fallback небезопасен по конструкции.** `EXPO_PUBLIC_TALENTSLAB_APP_KEY` (`src/config.ts:22-28`) может читать кандидата по email и неизбежно извлекается из bundle. Сейчас ключ пуст, реального секрета в repo нет, но fallback нужно удалить.
4. **Все вкладки eager-mounted.** `lazy:false` и `detachInactiveScreens:false` (`src/navigation/index.tsx:147`) запускают шесть модулей сразу. Повторные `useTalentProfile`/`useMyCourses` создают дубли запросов. Нужны lazy tabs и shared query cache/dedupe.
5. **Persistence writes не сериализованы.** Fire-and-forget `saveJSON` допускает stale-write race при быстрых изменениях.
6. **API error model неоднородна.** Часть функций бросает, часть возвращает `[]/false/null`, поэтому UI часто не различает outage и empty state.
7. **Нет root ErrorBoundary.** Ошибка render/provider закрывает всё приложение.
8. **Deep linking частичный.** Custom scheme есть, но нет `NavigationContainer linking`, associated domains и Android intent filters. Invite parser не проверяет trusted host перед mutation.
9. **Offline downloads не namespaced по userId.** При auth restoration timeout они могут стать доступны в standalone screen без подтверждённого entitlement.
10. **Прямая Clerk dependency попадает под high-severity advisory.** Установлена `@clerk/clerk-expo` 2.19.31, а advisory помечает диапазон до 2.19.35 включительно; обновление нужно делать совместимо с Expo/React 19 и после auth regression suite. Источник: [GHSA-w24r-5266-9c3c](https://github.com/advisories/GHSA-w24r-5266-9c3c). Остальные результаты `npm audit` в основном транзитивны через Expo CLI/Metro и требуют отдельного triage, а не слепого major-upgrade Expo.

### Функциональная логика

1. **Career показывает ложный success.** `CareerProvider.apply()` записывает local id и игнорирует результат server request (`src/state/CareerContext.tsx:73-84`), а detail сразу показывает «Отклик отправлен» (`src/screens/career/VacancyDetailScreen.tsx:275-287`). Нужны pending/confirmed/failed и retry queue.
2. **Career error-state недостижим.** `fetchVacancies()` превращает network/HTTP error в `[]` (`src/data/career.ts:116-135`), тогда как Context ожидает exception (`src/state/CareerContext.tsx:56-68`).
3. **LMS progress может не синхронизироваться.** `markLessonComplete` не проверяет `res.ok`, глотает ошибку и не имеет retry queue (`src/data/api.ts:273-293`).
4. **Mock fallback расходится с архитектурным требованием.** `CourseContext` намеренно оставляет `[] + error` и `source='live'` (`src/state/CourseContext.tsx:59-77`), хотя `AGENTS.md` требует `source:'mock'` при outage.
5. **Обещанный step tracking отсутствует.** Join Challenge просит обязательное согласие на подсчёт шагов/Apple Watch/Google Fit, но интеграций HealthKit/Health Connect в dependencies и коде нет (`src/screens/community/JoinChallengeScreen.tsx:185-197`).
6. **Android Maps key — placeholder.** `app.json:51-54` содержит `REPLACE_WITH_GOOGLE_MAPS_ANDROID_KEY`; `react-native-maps` используется в основной карте и workout tracker.
7. **Profile applications всегда пусты.** Profile фильтрует exported `JOBS`, который равен `[]`, вместо live jobs или `/me/vacancy-applications`.
8. **Нет automated quality system.** 0 test/spec files, нет test/lint scripts, Jest, React Native Testing Library, Maestro/Detox.
9. **Career недоступен из обычного UI.** Корневой экран показывает только «Раздел в разработке» (`src/screens/career/CareerHomeScreen.tsx:16-43`), хотя live vacancies API и detail/apply/create screens существуют. Нужно либо включить каталог, либо честно исключить модуль из release scope и убрать вкладку.
10. **Cold deep link в курс имеет race.** `CourseDetailScreen` вызывает `loadDetail` только если summary уже загружен, но effect не зависит от `course` (`src/screens/lms/CourseDetailScreen.tsx:48-62`). При cold link effect не повторится после прихода каталога, и уроки останутся пустыми.

## Целевая шкала шрифтов

Текущую семантику можно сохранить, немного поправив line-height и правила использования:

| Token | Size / line-height | Face | Использование |
|---|---:|---|---|
| `largeTitle` | 34 / 41 | Gotham Bold | корневой заголовок |
| `title1` | 28 / 34 | Gotham Bold | hero/detail |
| `title2` | 22 / 28 | Gotham Bold | заголовок секции |
| `title3` | 20 / 25 | Gotham Medium/Bold | карточка/подсекция |
| `headline` | 17 / 22 | Gotham Medium/Bold | CTA, важный label |
| `body` | **17 / 24** | Gotham Book | основной текст/input |
| `callout` | **16 / 22** | Gotham Book/Medium | компактное пояснение |
| `subhead` | 15 / 20 | Gotham Book/Medium | вторичный текст |
| `footnote` | 13 / 18 | Gotham Book/Medium | metadata |
| `caption1` | 12 / 16 | Gotham Book/Medium | вспомогательный текст |
| `caption2` | 11 / 14 | Gotham Medium | только короткие badges/tab labels |

Обязательные правила:

- 10 pt в UI не использовать;
- 11 pt — только короткая, не основная информация;
- body/input — 17/24, минимум 16/22;
- не смешивать custom `fontFamily` и `fontWeight`; выбирать конкретный Gotham face;
- `allowFontScaling` оставлять включённым;
- не ставить `maxFontSizeMultiplier` для content text;
- не ужимать постоянный текст через `adjustsFontSizeToFit`;
- buttons: `minHeight: 50`, vertical padding 12–14, до 2 строк;
- chips/segments/tab targets: 44 pt iOS, 48 dp Android;
- при 200% текст не перекрывает controls и остаётся доступен полностью;
- проверить Gotham Cyrillic/Kazakh glyphs и baseline на реальном Android; если метрики нестабильны, системный SF/Roboto использовать для body, Gotham оставить для brand/headings.

## Рекомендуемые design tokens

Добавить:

- `onBrand`, `onAccent`, `onSemantic`;
- `textPrimary`, `textSecondaryAccessible`, `textMutedAccessible`;
- `successText`, `warningText`, `dangerText` отдельно от icon/fill colors;
- `controlMinHeightIOS=44`, `controlMinHeightAndroid=48`;
- `contentInset=16/20`, `sectionGap=32/40`;
- semantic radii: `control=12`, `card=16`, `sheet=24`, `pill=999`;
- standard states для loading/empty/error/offline/success;
- `BottomActionBar`, `AccessibleField`, `AccessibleModal`, `StatusBadge`.

## Test strategy

### Unit

- challenge points/bonus, Almaty day rollover and queue dedupe;
- course progress and retry queue;
- API Zod mappers and malformed payloads;
- resume completeness;
- map nearest/filter/isOpenNow;
- contrast tests для каждой accent/semantic pair;
- persistence registry и account wipe.

### Component/integration

Для каждого data-driven экрана: loading, empty, offline, 401, 403, 404, 429, 500, timeout, malformed JSON, retry. Отдельно: OTP/SSO/resume gate, career apply success/failure, LMS purchase return/progress, modal focus, font scale 100–200%.

### E2E и реальные устройства

- onboarding → OTP/SSO → resume → tabs;
- buy on web → return → owned HLS → complete → offline audio;
- challenge apply/approve/progress/offline queue/23:01 rollover;
- map permissions denied/granted, route, add/review, Android Google map;
- career apply/status;
- AI history account isolation;
- account deletion;
- push/deep link/background/kill/relaunch.

Матрица: iPhone SE, standard iPhone, Pro Max, Android 360×800, планшет; light/dark; 100/135/160/200% text; VoiceOver/TalkBack; Reduce Motion/Transparency.

Quality gates: 0 TypeScript/Expo Doctor errors, 0 P0, 100% critical-flow scenarios, ≥90% coverage business logic, ≥80% line coverage, build-time запрет placeholder keys.

## Порядок исправлений

### Sprint 0 — 1–2 дня

1. Исправить reset registry и account isolation.
2. Ввести единый logout coordinator.
3. Удалить public Talentslab app-key fallback.
4. Добавить delete-account flow.
5. Настроить Android Maps key/build validation.
6. Обновить три Expo patch dependencies и Clerk до patched release.

### Sprint 1 — 3–5 дней

1. Ввести accessible foreground tokens и исправить contrast.
2. Удалить 10 pt, переделать tab bar на 5 destinations.
3. Перевести controls на `minHeight`, убрать массовое автоужатие.
4. Ввести AccessibleField/Modal/Progress и закрыть icon-button labels.
5. Перенести bulk state из SecureStore, добавить serialized writes/migrations.

### Sprint 2 — 5–8 дней

1. Унифицировать API `Result<T, ApiError>` и runtime contracts.
2. Исправить career/LMS false success, добавить retry queues.
3. Добавить shared query cache и lazy tabs.
4. Утвердить offline/mock policy.
5. Реализовать честный health integration или убрать обещание/обязательный consent.

### Sprint 3 — release hardening

1. Unit/component/E2E suite и CI.
2. VoiceOver/TalkBack и device matrix.
3. Performance profiling, bundle/assets/fonts optimization.
4. Store checklist, privacy labels, account deletion, UGC moderation regression.

## Что уже хорошо

- Strict TypeScript проходит.
- iOS/Android Metro exports проходят.
- Публичные production API доступны.
- Базовая type scale близка к iOS HIG.
- Brand navy имеет высокий контраст на белом; white on navy также проходит.
- SafeAreaProvider и общие Screen/NavHeader/UI atoms уже есть.
- Reduce Motion и Reduce Transparency читаются из OS.
- Clerk token хранится в SecureStore; секретов в repo не обнаружено.
- LMS boundary частично валидируется Zod.
- Challenge offline sync защищён от stale responses и умеет retry.
- Download manager отменяет in-flight tasks и удаляет файлы при штатном profile logout.

Это хорошая основа для доведения до production: проблема не в выбранной базовой шкале шрифтов, а в её обходе на экранах, слабом контрасте и отсутствии проверяемых компонентных правил.

## Статус исправлений — 29 августа 2026

В рамках follow-up исправлены все найденные P0 и основные P1, доступные в mobile-репозитории:

- полный account-scoped reset, единый logout и Clerk delete-account;
- bulk storage, миграция и защита от stale async writes;
- удалён публичный Talentslab app-key fallback;
- доступные foreground/label/semantic tokens, 12 проверенных accent-палитр;
- единая шкала Gotham Rounded, увеличенные line-height/touch targets, удалено автоужатие текста;
- пять нижних вкладок; Career сохранён как полноценный раздел из Profile;
- Android metric/text editors и достижимый GPS WorkoutTrack;
- live Career catalog и честные apply/error states;
- LMS mock fallback, cold deep-link reload, проверка/повтор progress POST и rollback false success;
- lazy tabs, deep links, legacy notification routing и app-level Error Boundary;
- динамический Expo config без placeholder Google key и лишних Android media permissions;
- добавлены Jest-проверки error recovery и LMS progress retry.

Финальные автоматические gates: TypeScript PASS, Jest 2 suites / 3 tests PASS,
Expo Doctor 18/18 PASS, Metro export iOS PASS, Metro export Android PASS.

За пределами этого репозитория остаётся серверная гарантия каскадного удаления
данных LMS/Talentslab после `Clerk user.delete()` и ручная проверка VoiceOver/TalkBack,
геолокации и визуальных состояний на реальных устройствах.
