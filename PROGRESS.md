# Перенос дизайна handoff-2026-10-20 — прогресс

Спецификация: `divergents-design-handoff-2026-10-20/HANDOFF.md` (рендеры в `screens/`,
исходники прототипа в `design-source/*.dc.html`). Промпт внутри HANDOFF.md ссылается на
`docs/design-handoff-2026-10-20/` — папка лежит в корне репозитория, путь читать так.

Обновлено: 20.10.2026.

## Решения владельца
- **Базовый коммит.** С 23.09 ничего не коммитилось (мешал «зависший» `.git/index.lock`
  от 10.10, удалён). Вся работа релизов 84–92 зафиксирована одним коммитом
  «Снимок рабочего дерева до переноса дизайна». Фазы дизайна идут поверх, отдельными коммитами.
- **Фаза 5 (Вход и онбординг) — отложена.** Нет ответа, поддерживаются ли Google / Apple и
  «код на почту». Не делать, пока владелец не ответит.

## Статус фаз (раздел 7 HANDOFF.md)

| Фаза | Статус |
| --- | --- |
| 0. Подготовка: handoff в репозитории, базовый коммит, проверка базы | ✅ сделано |
| 1. Токены и общие компоненты | ⏳ начата: собраны находки (ниже), кода ещё нет |
| 2. Таб-бар и шапки вкладок | ⬜ не начата |
| 3. Обучение (главная), Мои тренировки, Профиль | ⬜ не начата |
| 4. Сообщество (главная) | ⬜ не начата |
| 5. Вход и онбординг | ⏸ отложена (см. решения) |
| 6. Reading фаза 1 | ⬜ не начата |

База зелёная: `npx tsc --noEmit`: 0 ошибок; `npm test`: 94 набора, 663 теста проходят;
`npm run storybook:generate` работает.

## Фаза 1: что уже выяснено (в код ещё не перенесено)

- **`shadows.tappable`** — добавить в `src/theme/tokens.ts` рядом с `shadows.card` / `floating`:
  `shadow({ color: '#101828', opacity: 0.16, radius: 14, y: 10, elevation: 5 })`.
- **`IconTile`** — новый файл `src/components/IconTile.tsx`. Похожий `IconBadge.tsx` уже есть
  (круг/скругление, тоны brand/success/danger/neutral, 28–36). Решить: расширить `IconBadge` или
  завести `IconTile` и перевести на него вызовы. Значения тонов, размеры 36/44/52, радиус 0.3×,
  иконки 20/24/28 — в `design-source/IconTile.dc.html`. Градиент — `expo-linear-gradient` (установлен).
- **`person-running`** — иконки в `SFIcon.tsx` идут через `@expo/vector-icons` (Ionicons + MCI),
  `figure.run` сейчас → MCI `run`. Нужна SVG-ветка в `SF` (`react-native-svg` 15.12.1 установлен);
  путь для viewBox 24 — `design-source/Icon.dc.html`, ключ `"person-running"`. Варианты solid и line
  почти совпадают (оба залитые).
- **`NavHeader`** — по умолчанию уже `plain` (без фона). Вариант `inline` (белая подложка +
  линия) и `frosted` нигде в экранах не используются (используются только plain / hero / overlay).
  План: убрать `inline` из API, поправить `src/components/__tests__/learningComponents.test.tsx:113`
  (перебирает варианты) и stories. Варианта `modal` в коде нет.
- **`StatusBadge variant="frosted"`** — фон `rgba(255,255,255,0.78)`, текст цвета тона (neutral →
  `#1C1C1E`). Значения — `design-source/StatusBadge.dc.html`.
- **`SearchField surface="raised"`** — белое поле вместо `fillTertiary` (в тёмной теме — `cardBg`).
  Сейчас у компонента нет prop `surface`.
- **Авто-прокрутка строк разделов** — `SectionTabs` уже прокручивает к выбранному (`reveal`).
  Проверить горизонтальные ряды `Chip` (MapHome, AddPlace, MyFitness, FilterPicker, ChallengePicker,
  категории курсов на LMSHome).
- **U+00A0.** `src/data/format.ts` → `fmtInt` уже чистит (в regex стоят *литеральные* U+00A0/U+202F —
  при правке не потерять, лучше переписать через `   `). `api.ts → groupNum/formatPrice` безопасны.
  План: добавить в `format.ts` `safeSpaces`, `fmtDecimal`, `fmtDate`, `fmtDateTime` и перевести на них:
  - числа: `ReadingTeamCard.tsx:31-32`, `ReadingBookHistoryCard.tsx:23`, `ReadingMemberRow.tsx:23,26`,
    `ReadingPaceSummary.tsx:13`, `ReadingProgressSummary.tsx:27`,
    `ChallengeDetailScreen.tsx:1011-1017` (Intl.NumberFormat);
  - даты: `VideoScreen.tsx:28`, `ChallengeHistoryScreen.tsx:23`, `ServerChannelScreen.tsx:34`,
    `CreateContentScreen.tsx:52`, `ChallengeDetailScreen.tsx:1245,1269`, `NotificationsScreen.tsx:27`,
    `ReadingBookHistoryCard.tsx:25`, `AchievementBadgeTile.tsx:36`, `BookCommentCard.tsx:13`,
    `readingCreation.ts:23`, `offlineEventPolicy.ts:8`, `programResults.ts:7,11`, `places.ts:145`.
  - Дополнить `src/data/__tests__/format.test.ts`.

## Как устроен код (для следующих фаз)
- Правила: `docs/adr-ui-component-boundaries.md`. Компоненты плоско в `src/components`, без `style`
  снаружи; раскладка — `Wrapper.tsx`. Тема — `useTheme()` (`T`, `ty`, `isDark`, `reduceTransparency`).
- Stories: `src/components/*.stories.tsx`, параметры `scheme: 'dark'`, `textSize: 'xl'`,
  `viewport: 'compact'`, `reduceTransparency`. Пример — `StatusBadge.stories.tsx`.
  После добавления: `npm run storybook:generate`.
- `npm run ui:audit` показывает компоненты, которые ещё нарушают границы.
- Вероятные соответствия прототип → код (проверить): `LearningResumeCard` ↔ `CourseProgressCard`,
  `ShortcutTile` ↔ `LearningShortcut`, `CommunityChallengeProgress` ↔ `ActiveChallengeCard` /
  `CommunityChallengeCard`, `CommunityActivityCard` ↔ `PersonalActivityCard`,
  `ChannelCard` ↔ `CommunityChannelRow`, `EventCard` ↔ `CommunityTripCard`,
  `ProfileButton` ↔ `ProfileAvatarButton`, `NavBarLarge` ↔ `NavBarLarge`, Reading — см. таблицу раздела 6.

## Проверка после каждой фазы
`npx tsc --noEmit && npm test && npm run storybook:generate`, затем скриншоты из симулятора
против `screens/`. Раздел «Карьера» не трогать. Бизнес-логику, API и тексты правил Reading не менять.

## Нужны данные / открытые вопросы (накапливать здесь)
- Фаза 5: поддерживаются ли вход через Google / Apple и «код на почту» (владелец).
- Reading: имя капитана в `ReadingTeamCard` — проверить, есть ли в API.
