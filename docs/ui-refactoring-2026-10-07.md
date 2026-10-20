# UI refactoring — журнал изменений

Статус: **второй этап, глобальная миграция не завершена**. Backend, API,
начисления баллов, права доступа и публикация приложения не входят в эти изменения.
Существовавшие пользовательские правки не откатывались.

## Последовательно по компонентам

| Файл | Что было плохо | Что теперь внутри | API добавлен / упрощён | Что удалено | Почему чище |
|---|---|---|---|---|---|
| `components/Button.tsx` | Две реализации кнопок, внешние цвета/паддинги/высота и layout в `style` | Фон, текст, спиннер, иконка, радиус, состояние нажатия, размеры | `variant`, `tone`, `size`; прежние action/disabled/loading | `PrimaryButton`, `SecondaryButton`, `style`, `color`, `textColor`, `tinted` | Одна реализация всех режимов, нет косметических обходов |
| `components/Wrapper.tsx` | Размещение смешивалось с косметикой дочернего компонента | Только раскладка контейнера | `dir`, gap/padding/margin, flex, выравнивание и границы ширины контейнера | Нет произвольного `style` или spread ViewProps | Wrapper не может перекрасить или скруглить ребёнка |
| `components/CareerComingSoon.tsx` | Иллюстрация, тексты и оформление были частью экрана | Вся презентация существующего состояния «Раздел в разработке» | `badge`, `title`, `description` | Не принимает тему/стили снаружи | Экран только собирает интерфейс; новых функций не придумано |
| `screens/career/CareerHomeScreen.tsx` | Native JSX и inline-косметика непосредственно в странице | Перенесены в CareerComingSoon | Screen + header + Wrapper + компонент | Локальная косметика, неиспользуемые theme/notification зависимости | Завершённый перенос этого экрана |
| `components/ProgressBar.tsx` | Произвольные `color`, `height`, `track` | Цвет, толщина, track, округление, ограничение значения 0–1 | `tone`, `size`; value/accessibilityLabel сохранены | `color`, `height`, `track` | Единое отображение прогресса курсов, книг, программ и загрузок |
| `components/ListSection.tsx` | `style` менял внешние отступы; компонент сам решал margin до соседей | Фон, скругление, внутренние отступы заголовка/footer | `header`, `footer`, `children` | `style`, внешние margins | Все call sites используют Wrapper; отступы не накладываются друг на друга |
| `components/ListRow.tsx` | Произвольный цвет значения | Вся косметика строки и разделителя | `detailTone` secondary/brand/danger | `valueColor`; три неработавших overrides без detail убраны | Нет цветового API, публичные слоты остаются композиционными |
| `components/SectionHeader.tsx` | Реализация скрывалась среди несвязанных atoms | Заголовок, действие, адаптация крупного текста | Существующий семантический API сохранён | Общий файл реализации | Самостоятельный компонент и stories |
| `components/Segmented.tsx` | Общий файл atoms | Состояния выбора, radio a11y, адаптация по ширине/шрифту | items/value/onChange/leadingIcons сохранены | Общий файл реализации | Проверяется независимо от экранов |
| `components/Chip.tsx` | Общий файл atoms | Выбранное/обычное состояние, touch target, текст/иконка | label/active/icon/onPress сохранены | Общий файл реализации | Самостоятельные stories включая read-only и крупный текст |
| `components/StatusBadge.tsx` | Capsule принимал bg/color/style и произвольную внутреннюю разметку | Фон, текст, иконка, плотность, поверхность для фотографий | `label`, `icon`, `tone`, `variant`, `size` | Capsule, CapsuleContent, bg/color/style | Весь проект переведён на семантические бейджи |
| `components/ApplicationStatusBadge.tsx` | Четыре таблицы цветов статусов в экранах | Статус → оформление и подпись | `status`, `context`; общий formatter для VoiceOver | Таблицы bg/color и statusMeta | Заявки и история используют одну систему; неизвестный статус сохраняет pending fallback |
| `components/FieldValueRow.tsx` | Три копии Row с `T: any` внутри экранов | Типографика, цвета, колонки, переносы | `label`, `value`, `hideWhenEmpty` | Row/T/k/v | Заявки событий, челленджей и вакансий переиспользуют один компонент; пустые строки ведут себя как прежде |
| `components/IconBadge.tsx` | IconCircle/IconSquircle с bg/color/числовыми size/iconSize | Палитра и контраст, форма, размеры иконки | `tone`, `variant`, `shape`, семантический `size` | IconCircle/IconSquircle, bg/color/iconSize | Внешний код выбирает смысл; иконки маршрута используют единый brand tone |
| `components/ui.tsx` | Монолит atoms с косметическими overrides | Реализации вынесены в плоскую папку | Только re-exports для существующих import paths | Все локальные реализации; неиспользуемые Card/Separator после поиска call sites | Один источник реализации каждого компонента, без старых override API |

## Миграция экранов и составных компонентов

Во всех местах использования старых кнопок, Capsule, IconCircle/IconSquircle,
ListSection.style и ProgressBar.color/height обновлён API. Callback, data fetching,
навигация и условия доступа сохранены. Keys у секций перенесены на внешние Wrapper.
Это **не означает**, что остальные inline-стили этих экранов уже убраны.

- Обучение: CourseCardPremium, CourseDetail, Downloads, Video и существующие CTA каталога.
- Сообщество: CommunityHome, ChallengeDetail/Days/Roster/Applicants, JoinChallenge,
  TeamStandings/OverallStandings, ManageChallenge, CreateContent, TripDetail,
  MeetupDetail, EventApplicants, WorkoutDetail/History и ChallengeTaskRow.
- Профиль: ProfileHome, MyFitness, Personalize, ChallengeHistory, AchievementCollection.
- Карьера: CareerHome, TalentProfile, ResumeForm, CreateVacancy, VacancyDetail/Applicants.
- AI: AIChat. Карта: MapHome, AdminPlaces, PlaceDetail, AddPlace.
- Регистрация: NicknameGate, Onboarding и существующие формы с общими кнопками.

## Storybook

`npm run storybook` включает изолированную библиотеку React Native.
`npm run storybook:generate` обновляет официальный generated registry.
Новые истории рядом с компонентами, не в Screens. ThemePreviewProvider не читает
аккаунт, SecureStore или API; StoryCanvas загружает реальные шрифты приложения.
Проверяемые состояния: light/dark, крупный текст, узкая область, loading/disabled,
выбранный/невыбранный, неизвестный статус и пустые поля.

Entry `index.js` и Metro отключают Storybook в production. Перенос темы ограничен
экспортом существующего контекста; пользовательские настройки не менялись.

## Проверки первого этапа и границы результата

- TypeScript: успешно после миграции кнопок, бейджей, списков и иконок.
- Jest: **52 suites / 361 tests** успешно, включая заявки, события, программы,
  курсы, чек-ины и новые тесты контрактов компонентов.
- Metro: dev Storybook bundles iOS/Android успешно пересобраны после добавления
  всех 15 историй компонентов; generated registry обновлён.
- Production JS export iOS/Android: успешно; проверенные файлы не содержали
  Storybook-маркеров. Это не подписанная нативная сборка и не TestFlight-релиз.
- Визуальная проверка симулятора: **не завершена** — Mac заблокирован, CUA отказал
  в чтении экрана. Установлен Expo Go SDK54 на локальный iPhone 17 Pro simulator.
- `npm run ui:audit`: 51 screen-файл, 2 без найденных нарушений, 2830 оставшихся
  мест для ручного разбора; stories есть у 15 из 50 файлов компонентов.
  Счётчик — статический инвентарь, не процент завершения и не доказательство UX.
- `npm audit`: 78 findings, в том числе critical в transitive `shell-quote`.
  Причинность относительно прежнего lockfile не установлена; автоматический
  `audit fix --force` не запускался, чтобы не менять SDK вне задачи.

## Следующий проход

1. Screen/headers/SF и составные карточки: убрать оставшиеся публичные overrides.
2. Локальные компоненты внутри каждого screen, включая крупные ChallengeDetail,
   CommunityHome, MapHome и ProfileHome; не переносить бизнес-логику вместе с UI.
3. Полное story-покрытие + нативная проверка обеих тем, длинных русских строк,
   Dynamic Type, клавиатуры и узких устройств.
4. Глобальный новый внешний вид — только после выбора визуального макета.

Выпуски и backend не публиковались. Изменения остаются локальными.

## Второй этап: шапки, обучение, состояния

Использованы design-system, UI/UX Pro Max и Mobile App Design Standards:
отделение данных от представления, семантические состояния, safe area,
доступные названия действий и крупный текст. Impeccable/extract применён для
выноса компонентов; пользовательское требование выносить даже одноразовые
компоненты имеет приоритет над рекомендацией ждать повторных использований.
Глобальные визуальные изменения по-прежнему ждут выбора макета.

### Последовательно по файлам

| Файл | Что было плохо | Что внутри компонента | Новый / упрощённый API | Что удалено | Почему чище |
| --- | --- | --- | --- | --- | --- |
| components/Screen.tsx | Произвольный фон и contentStyle могли менять устройство страницы | Фон, safe area, compact-header, refresh control | surface grouped/transparent; bottomInset | bg, contentStyle, неиспользуемый gradient | Экран нельзя перекрасить или изменить произвольным style |
| components/ProgressiveBlur.tsx | Внешние height/intensity/layers/style определяли визуальный результат | Размер с учётом safe area, интенсивность, слои, Android/Reduce Transparency fallback | Только position top/bottom | height/intensity/layers/style | Один стандарт эффекта для всех экранов |
| components/NavHeader.tsx | transparent/tint/blur/hairline/style собирали внешний вид в местах вызова | Фон, разделитель, contrast для hero, blur и fallback | variant inline/plain/frosted/hero/overlay | Косметические props; дублирующий BackNav | Все detail-экраны используют один семантический компонент |
| components/NavBarLarge.tsx | Реализация в общем headers-файле | Типографика, выравнивание trailing, крупный текст | title/trailing сохранены | Общая реализация в headers | Независимый компонент и stories |
| components/HeaderIcon.tsx | Снаружи передавались цвет и числовой размер | Размер, фирменный цвет, badge, touch target | name/onPress/badge; обязательный label | color/size | Действие не теряет доступное название; внешний цвет не нужен |
| components/NavRoundButton.tsx | Числовой size и реализация внутри NavHeader | Контраст поверх фото, круг, border, shadow, touch target | icon/onPress/scheme; обязательный accessibilityLabel | size | Самостоятельный навигационный контрол |
| components/headers.tsx | Несколько реализаций вместе | Реализации перенесены в собственные файлы | Только re-exports NavBarLarge/HeaderIcon | BackNav и локальные реализации | Старый import path не сохраняет старые override API |
| components/ProfileAvatarButton.tsx | Компонент сам читал Clerk и анкету, принимал размер | Размер, фото, placeholder, обработка ошибки изображения | photoUrl/onPress | size, загрузка профиля из UI | Превью не требует аккаунта; новая ссылка повторно загружается после ошибки старой |
| state/useProfilePhoto.ts | Приоритет источников смешивался с аватаром | Не UI: прежний приоритет анкета → Clerk | Возвращает URL/null | Зависимость визуального компонента от аккаунта | Экраны передают данные, аватар отвечает только за вид |
| components/PressableScale.tsx | style и scaleTo превращали feedback-wrapper в оформляемую заготовку | Только press-анимация, haptic, disabled/Reduce Motion | children/onPress/disabled/accessibilityLabel | style/scaleTo | Облик карточки теперь принадлежит карточке |
| components/CourseCover.tsx | Локальный Cover с произвольным tint/iconColor и размерами | Обложка, cover fit, кэш, переход и фирменный fallback | imageUrl/icon; variant card/featured | Косметические аргументы старого Cover | Обложка воспроизводима отдельно |
| components/CourseCardPremium.tsx | width и style, переданный PressableScale | Фон, форма, тень, текст, бейдж и прогресс | Данные курса/owned/progress/showPrice/onPress сохранены | width и оформление в PressableScale | Ширина задаётся соседним Wrapper; содержимое владеет косметикой |
| components/FeaturedCard.tsx | Реализация в CourseCardPremium, внутренний marginHorizontal до соседей | Собственное оформление featured-карточки | Прежние содержательные props | marginHorizontal; style у PressableScale | Экран сам задаёт размещение, карточка — вид |
| lib/coursePresentation.ts | Таблица отображения доступа находилась рядом с несколькими UI-компонентами | Не UI: чистая функция подписи и символа | courseAccessBadge(course, showPrice) | Дублирование между карточками | Это отображение статуса, не выдача доступа |
| components/LearningWelcome.tsx | Приветствие и брендовая строка были native JSX на экране | Типографика, композиция логотипа, перенос длинного имени | displayName/courseCount | Native JSX и theme-зависимость экрана | Самостоятельное приветствие |
| components/LearningShortcut.tsx | Три inline-баннера с повторяющейся косметикой | Цвет, gradient, размер иконки, подписи, press feedback | kind downloads/gift/library с соответствующими данными | Произвольные cosmetics; дубли баннеров | Union API не требует ненужных полей для другого вида баннера |
| components/CourseCatalogGrid.tsx | Раскладка карточек смешивалась с данными главного экрана | Только композиция через Wrapper | courses/ownedProgress/showPrice/onCoursePress | Карточные width/style overrides | Учитывается реальная ширина контейнера, не только устройства |
| components/OwnedCourseShelf.tsx | ScrollView с inline-отступами и ширина, переданная в карточку | Горизонтальная полка; размещение Wrapper | courses/progress/onCoursePress | width у CourseCardPremium | Узкое полотно и крупный текст не требуют менять API карточек |
| components/StateViews.tsx | Общий файл нескольких компонентов с локальными CardSkeleton/GlyphBadge | Реализации вынесены, только re-exports | Существующие import paths сохраняются | Все локальные UI-реализации | Один компонент — один файл |
| components/Skeleton.tsx | w/h/radius/style задавались снаружи | Форма и размеры смысловых placeholders | variant cover/title/body/avatar | w/h/radius/style | Нельзя произвольно переопределить внешний вид загрузки |
| components/CourseCardSkeleton.tsx | Локальный компонент принимал width | Форма карточки; строки внутри через Wrapper | Без props | width | Геометрия внешней сетки не проникла в карточку |
| components/CourseGridSkeleton.tsx | Геометрия по экрану могла не соответствовать вложенному контейнеру | Сетка через Wrapper, объявление загрузки для accessibility | count | Числовая ширина карточки | Компактное полотно переключается в одну колонку |
| components/ListSkeleton.tsx | Компонент сам устанавливал внешние margins | Фон списка, строки и разделители | rows | marginHorizontal | Все четыре места использования получили внешний Wrapper |
| components/IconBadge.tsx | GlyphBadge дублировал существующий иконочный компонент | Двухслойный halo и контраст | variant halo; для halo размер/shape запрещены типом | GlyphBadge с tint/fg | Переиспользован компонент, а не добавлен косметический дубль |
| components/EmptyState.tsx | Локальная реализация общего файла | Иконка, текст, CTA и состояние отсутствия данных | Прежний содержательный API | Косметические props дочерней иконки | Отдельные stories и сохранённое действие восстановления |
| components/ErrorState.tsx | Аналогичная локальная реализация | Ошибка, alert и retry | message/onRetry | tint/fg у дочерней иконки | Ошибка не смешивается с пустым каталогом |
| screens/lms/LMSHomeScreen.tsx | Экран владел разметкой и косметикой приветствия, карточек, баннеров и сеток | Всё перенесено в перечисленные компоненты | Экран хранит данные, фильтры, условия и маршруты | View/Text/Pressable/ScrollView/style, theme/dimension зависимости | Ни inline-косметики, ни локальных компонентов; прежние условия доступа сохранены |
| components/SearchField.stories.tsx | Не было изолированного сценария ввода | Не меняет реализацию контрола | Управляемый ввод и очистка в preview | — | Проверяется взаимодействие, а не статическая картинка |
| components/FilterPicker.stories.tsx | Не было preview выбора категории | Не меняет реализацию контрола | Раскрытие/выбор и длинные категории | — | Выбор меняет состояние истории |
| components/ThemePreviewProvider.tsx | Reduce Transparency нельзя было переключать в preview | Изолированная тема | reduceTransparency | Жёсткое true | Можно проверить настоящий blur и fallback отдельно |
| components/StoryCanvas.tsx | Только scroll-полотно, неудобное для Screen; motion всегда отключён | Полноэкранное и контентное полотно, тема и шрифты | layout, reduceMotion, reduceTransparency | Жёсткие preview-настройки | Screen не вложен в лишний ScrollView, а animation-story может анимироваться |
| components/Wrapper.tsx | Раскладка не могла измерить свой контейнер | Только layout | onLayout | — | Адаптивность не требует открывать style или нативный props-spread |

### Сохранение поведения и небольшие визуальные различия

- Все использования удалённых API мигрированы, TypeScript проверен. Новые
  re-export barrels не содержат реализаций и не принимают старые overrides.
- safe area, возврат назад, pull-to-refresh, доступность, фича-флаги, подарки,
  прогресс, поиск, ошибки и маршруты проверены тестами; API/запись данных не менялись.
- Отсутствующая обложка использует фирменный тематический fallback, а не
  course.tint/iconColor. Демо-маркер переиспользует общий warning badge.
- Длинные приветствия/подписи ярлыков больше не принудительно обрезаются.
- Выбранный семантический hero-вариант шапки делает и заголовок контрастным,
  а не только стрелку. Пиксельная идентичность прежнему UI не заявляется.
- Остальные native/косметические элементы книг, профиля, сообщества и карты
  остаются предметом следующих проходов. В частности, SFIcon/Logo ещё имеют
  старые числовые/цветовые API; этот этап не объявляет их мигрированными.

### Проверки второго этапа

- TypeScript: успешно.
- Jest: **54 suites / 381 tests**, включая 20 новых проверок.
- Storybook: **38 из 63 файлов компонентов** имеют stories; это учёт файлов,
  не доказательство покрытия каждого старого вложенного компонента.
- Dev bundles Storybook: iOS и Android успешно; новые stories присутствуют.
- Production JS export iOS + Android:
  `/tmp/divergents-ui-stage2.XAe7Z3`. Storybook/fixture-маркеры не найдены.
  Экспорт без bytecode использован для инспекции JS, не для публикации.
- Статический аудит: **3 из 51 screen-файла** без обнаруженных нарушений;
  **2781** оставшееся место. Было 2 / 51 и 2830. Это инвентарь для ручного
  разбора, а не процент законченности всей архитектуры.
- `git diff --check`: успешно.
- Визуальный QA iOS/Android не завершён: повторная попытка доступа к Simulator
  отклонена, поскольку Mac заблокирован. Автотесты не подменяют визуальную проверку.

Следующий последовательный проход: SFIcon/Logo с полной миграцией их API,
каталог и детали книг/курсов, затем крупные экраны сообщества и профиля.
Ничего не отправлялось в App Store, TestFlight, Google Play или production backend.
