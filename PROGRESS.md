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
| 1. Токены и общие компоненты | ✅ сделано (см. «Фаза 1: сделано») |
| 2. Таб-бар и шапки вкладок | ✅ сделано (см. «Фаза 2: сделано») |
| 3. Обучение (главная), Мои тренировки, Профиль | ✅ сделано (см. «Фаза 3: сделано») |
| 4. Сообщество (главная) | ✅ сделано (см. «Фаза 4: сделано») |
| 5. Вход и онбординг | ⏸ отложена (см. решения) |
| 6. Reading фаза 1 | ⬜ не начата |

База зелёная: `npx tsc --noEmit`: 0 ошибок; `npm test`: 94 набора, 663 теста проходят;
`npm run storybook:generate` работает.

## Фаза 1: сделано
- `shadows.tappable` в `src/theme/tokens.ts`.
- `IconTile` — новый компонент (`src/components/IconTile.tsx` + stories): тоны brand/challenge/trip/sport/
  violet/orange/pink/neutral, solid/soft, sm/md/lg = 36/44/52, иконки 20/24/28, радиус 0.3×. `IconBadge`
  оставлен для круглых статусных значков (halo, success/danger) — у него другая роль.
- `SF`: SVG-ветка; `figure.run` теперь рисует ручной глиф `person-running` из макета (все места с бегуном
  получили его автоматически). Добавлены имена `stopwatch`, `mountain.2.fill`, `tent.fill`,
  `chart.line.uptrend.xyaxis`, `kettlebell`, `waveform.path.ecg`, `arrow.down.circle.fill`, `books.vertical.fill`.
- `NavHeader`: вариант `inline` удалён из API (не использовался), `plain` — по умолчанию, без подложки и линии.
- `StatusBadge variant="frosted"`, `SearchField surface="raised"` (+ stories).
- `ChipRail` — горизонтальная строка чипов с прокруткой к выбранному; подключена на Карте. `SectionTabs`
  уже умел это (`reveal`). Остальные ряды чипов в приложении переносятся (`flexWrap`), прокрутка им не нужна.
- U+00A0: в `src/data/format.ts` добавлены `safeSpaces`, `fmtDecimal`, `fmtDate`, `fmtDateTime` (+ тесты);
  все `toLocaleString/toLocaleDateString/Intl.NumberFormat` в `src` переведены на них.

## Фаза 2: сделано
- `TabDock`: панель радиус 24, отступ 4, рамка 0.5, тень navy; ячейки без промежутков, высота 60;
  выбранная — заливка всей ячейки `brandTinted` + линия 0.5, радиус 18; невыбранные `#8A8F98`; подпись выбранной bold.
  Поведение «приподнятой капсулы» (позиция над safe area, мини-плеер, blur/Reduce Transparency) сохранено.
  `TAB_DOCK_HEIGHT` 80 → 68, `TAB_DOCK_GUTTER` 12 → 14.
- `ProfileAvatarButton`: зона 52, лицо 42 (фото или инициалы на градиенте), кольцо анкеты (скрыто при 0/100),
  бейдж событий «9+», `variant="floating"`. Данные — новый хук `src/state/useProfileButton.ts`
  (фото, имя, `profile.completeness`, непрочитанные уведомления). Стоит на Обучении, AI, Сообществе, Карте (floating), Карьере.
- `HeaderBackdrop` (`react-native-svg`): заливка + рисунок раздела; `Screen backdrop="learn|ai|community|profile"`.
  Показывается, пока фон в персонализации «По акценту» (по умолчанию); выбранный человеком другой фон
  (Аврора, Океан…) или «Без фона» — уважается. Цвета от акцента темы, в тёмной теме приглушены.
- `NavBarLarge` получил `subtitle`.

## Фаза 3: сделано
- **Обучение (главная):** `NavBarLarge` с подзаголовком-приветствием по времени суток; `SearchField raised` наверху —
  единственный поиск на странице; новый `LearningResumeCard` вместо `FeaturedCard` в «Продолжить» (обложка 64,
  «Урок N из M · название» — если текущий урок известен из каталога, иначе «категория · N уроков»; мягкая кнопка ▶,
  без синей полноширинной кнопки); две плитки `ShortcutTile` (Скачанные / Библиотека); `ResumeCallout` плоский
  («Заполните анкету · N из M»); «Мои курсы» — белые блоки 220 с запасом 24 под тень; «Все курсы» — `ChipRail`
  категорий (вместо `FilterPicker`) + сетка 2×, промежуток 12, блоки ряда одной высоты, внизу цена + шеврон.
  `CourseCardPremium` получил `variant="grid|shelf"`; `PressableScale` — `fill`; `LearningShortcut` оставлен только
  для подарка; `LearningWelcome` удалён; `ResumeCalloutCard` — представление, `ResumeCallout` — данные.
- **Мои тренировки:** `FitnessHero` (дорожки + стеклянная плашка 56 с бегуном), `FitnessRecordTile`
  (бегун brand, секундомер orange, горы trip, график violet), все плашки — `IconTile` (программа brand solid,
  цели brand soft, показатели: время → секундомер orange, иначе гиря violet; «История программ» soft).
- **Профиль:** заголовок «Сильные стороны · CliftonStrengths» без обрезки; таланты на английском
  (`gallupEnglishName` в `talentslab.ts` + тест); Гарднер в компактном виде — колонки 62, короткие подписи с эмодзи,
  прокрутка; карточка «Мои тренировки» — `IconTile` с бегуном.

## Фаза 4: сделано
- Новые: `CardMotif` (challenge / challengeDark / trip / sport — градиент + бледный рисунок), `TappableSurface`
  (белый блок-кнопка: радиус 14, `shadows.tappable`, тень снаружи, обрезка внутри), `CommunitySportCard`.
- `ChallengeProgressSummary` (= `CommunityChallengeProgress`): вся синяя карточка — ссылка, «таблетка»
  «Идёт · команда «…»», стрелка 36, участники · команды, полоса дня, три метрики с разделителями; кнопка
  «Войти в челлендж» удалена, добавлен prop `members`.
- «Открыт набор» (`CommunityChallengeCard`) — старый дизайн + тень + линия над нижней строкой.
- `PersonalActivityCard` — `IconTile`, тень, радиус 14. `CommunityChannelRow variant="cover|plain"` (cover на главной,
  без картинки канала падает в plain). `CommunityTripCard` — мятная карточка с мотивом гор, палатка для поездок от 2 дней,
  frosted-бейджи, «Бесплатно» зелёным; фото-обложка поездки на главной больше не показывается (согласован plain).
- Шапка: подзаголовок «Челленджи, поездки и встречи» (ключ `community_tagline`), строка с логотипом удалена.
- Отклонения: иконка спорта берётся из данных события (у пробежки — бегун, как в исходнике макета; в HANDOFF — «пульс»);
  горизонтальных лент на главной «Сообщества» нет — запас 24 под тень не понадобился.

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
