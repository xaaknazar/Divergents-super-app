# BACKEND.md — серверные эндпоинты для Divergents Super App

Приложение **API-driven**: фейковых mock-данных нет, экраны грузят контент с
сервера и показывают пустое/ошибочное состояние, если данных нет. Клиент читает
JSON с **divergents-lms.kz** под префиксом `/api/mobile` и **маппит** сырые shape-ы
сервера в view-model-типы экранов (`src/data/*.ts`).

## Общие правила
- **База:** `https://divergents-lms.kz` (константа `API_BASE` в `src/config.ts` и
  `src/data/api.ts`).
- **Auth:** защищённые эндпоинты принимают `Authorization: Bearer <Clerk session
  token>` (через `getToken()` из Clerk). Сервер верифицирует токен и резолвит
  пользователя по Clerk `userId` / email. Публичные читалки — без токена.
- **Графдеградация:** на ошибке/404/пустом ответе клиент возвращает `[]` / `null`
  и не падает. Поэтому новые фичи (vacancies, places, notifications,
  активный челлендж) уже сейчас показывают корректный пустой экран, а не краш.
- **Формат:** JSON. Списки сервер отдаёт завёрнутыми в ключ (`{ "courses": [...] }`,
  `{ "challenges": [...] }` и т.д.); клиент также принимает голый массив.

---

## 1. Уже реализовано на сервере

Эти эндпоинты существуют и используются приложением. Указаны **реальные** shape-ы
(сырой ответ сервера до маппинга в view-model).

### LMS / Обучение
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/courses` | нет |
| GET | `/api/mobile/courses/:id` | нет |
| GET | `/api/mobile/me/courses` | Clerk |
| GET | `/api/mobile/me/courses/:id` | Clerk |
| POST | `/api/mobile/me/courses/:id/progress` | Clerk (best-effort, body `{ lessonId, completed }`) |

Каталог `{ courses: ApiCourseSummary[] }`:
```ts
ApiCourseSummary = { id, title, description: string|null, imageUrl: string|null,
  price: number|null, category: string|null, categoryId: string|null, chaptersCount: number }
```
Деталь курса (публичная — HLS только у free-глав; `me/...` — HLS у всех глав):
```ts
ApiCourseDetail = { id, title, description, imageUrl, price, category,
  attachments: { id, name, url }[],
  chapters: { id, title, description, position, isFree, playbackId, hlsUrl }[],
  progress?: number /* 0..100, на owned-детали */ }
```
`me/courses` элементы дополнительно несут `{ progress: number, owned: boolean }`.

### Challenges (Community)
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/challenges` | нет |
| POST | `/api/mobile/challenges/:id/apply` | Clerk *(на сервере есть; клиентом пока не вызывается)* |
| GET | `/api/mobile/me/challenges` | Clerk *(на сервере есть; клиентом пока не вызывается)* |

`{ challenges: RawChallenge[] }`, команды **встроены** в каждый челлендж:
```ts
RawChallenge = { id, title, startISO: string|null, durationDays: number,
  categories: string[]|string|null, rules: string|null, price: number|null,
  status: 'open'|'active'|'archived', teams: RawTeam[], _count: { applications: number } }
RawTeam = { id, name, capacity: number, captain: string|null, _count: { applications: number } }
```

### Trips (Community)
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/trips` | нет |
| POST | `/api/mobile/trips/:id/apply` | Clerk *(на сервере есть; клиентом пока не вызывается)* |

`{ trips: RawTrip[] }`:
```ts
RawTrip = { id, title, region: string|null, date: string|null, days: number,
  price: number|null, spots: number, difficulty: string|null, description: string|null,
  status: string, createdBy: string|null, _count: { applications: number } }
```
Детали поездки отдельного эндпоинта нет — клиент берёт элемент из списка по `id`.

### Channels (Community)
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/channels` | нет |

Посты **встроены** в каждый канал (отдельного `/posts` нет):
```ts
ApiChannel = { id, handle: string|null, name, access: 'open'|'request'|'paid',
  price: number|null, bio: string|null, avatarUrl: string|null, status,
  createdBy: string|null, createdAt, posts: ApiChannelPost[], _count: { posts: number } }
ApiChannelPost = { id, type: 'article'|'audio', title, body: string|null,
  audioUrl: string|null, createdAt }
```

### Account / роль
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/me/role` | Clerk *(на сервере есть)* |

### AI
| Метод | Путь | Auth |
|------|------|------|
| POST | `/api/mobile/ai` | Clerk (опц.) |

Body `{ message: string, history?: { role, content }[], profileContext?: string }`
→ `{ answer: string }`. (Курс-тьютор `POST /api/ai/chat` → `{ answer, sources }`
живёт вне `/api/mobile`, см. `src/data/api.ts`.)

### Talentslab (talentslab.org, не divergents-lms.kz)
`GET /api/mobile/profile`, `POST /api/mobile/resume` — Clerk Bearer.

---

## 2. Маппинг приложение → сервер

Адаптации, которые клиент делает сам (экраны и view-model-типы не менялись):

- **Челленджи:** `status` `open→upcoming`, `active→active`, иначе `finished`;
  `participants = _count.applications`; `teams = teams.length`; `startLabel`
  = `идёт` (active) / короткая рус. дата (`12 авг`) / `скоро`; `maxFlags`
  по умолчанию 3 (парсится из `rules` при шаблоне `N 🚩`/`N флаг`); `subtitle`
  из `categories` или сниппета `rules`; `tint`/`icon` детерминированно по индексу.
- **Команды (экран записи):** берутся из `teams[]` первого `open` (иначе `active`)
  челленджа; `members = _count.applications`, `captain` по умолч. `—`.
- **Поездки:** `going = _count.applications`; `meta` = `region · дата`;
  `organizer = createdBy`, `organizerType = 'Divergents'`; `price` через
  `formatPrice`; `itinerary`/`included` = `[]`, `imageUrl = null` (нет на сервере).
- **Каналы:** `access` `paid→request` (платный канал убран из v1); `avatar =
  avatarUrl`; `verified=false`, `baseSubscribers=0`.
- **Посты:** разворачиваются из `channel.posts` с проставлением `channelId`;
  `date` — короткий рус. относительный лейбл (`5 мин назад`, `12 июн`); `icon`
  по `type`; `body` бьётся на абзацы `string[]`; `excerpt`/`readMins` выводятся
  из `body`; `likes=0`, `views='0'` (на сервере счётчиков нет).
- **AI:** клиент отдаёт серверу последний ход как `message`, предыдущие как
  `history` (срез последних 12 ходов).
- **Курсы:** `icon`/`tint`/`iconColor` назначаются детерминированно по `id`,
  `lessonsLabel` — рус. плюрализация по `chaptersCount`.

---

## 3. Осталось построить (полный бэкенд)

Четыре приоритетные фичи. Сейчас клиент шлёт запрос, получает 404 и показывает
пустой экран. Чтобы наполнить контентом — поднять эндпоинты ниже. Указаны
предлагаемая Prisma-модель, путь и **точный shape ответа, который ждёт клиент**
(сырой ApiX-тип до маппинга — смотри соответствующий `src/data/*.ts`).

### 3.1 Vacancies (Карьера) — `src/data/career.ts`
```prisma
model Vacancy {
  id           String   @id @default(cuid())
  title        String
  company      String?
  city         String?
  format       String?  // 'Офис' | 'Гибрид' | 'Удалёнка'
  salary       String?
  level        String?
  match        Int?     // 0..100, % совпадения с профилем
  reason       String?
  talents      String[] // matched Gallup-таланты
  goodBoss     String?
  goodCompany  String?
  requirements String[]
  about        String?
  postedLabel  String?
  logo         String?  // одна буква/эмодзи; иначе клиент берёт первую букву company
  color        String?  // hex; иначе клиент назначит по id
  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/vacancies` | нет/Clerk |
| GET | `/api/mobile/vacancies/:id` | нет/Clerk |
| POST | `/api/mobile/vacancies/:id/apply` | Clerk (опц., клиент уже вызывает) |

Ответ: `{ vacancies: ApiVacancy[] }`, деталь `{ vacancy: ApiVacancy }` или голый
объект. `ApiVacancy` = поля модели выше (все, кроме служебных).

### 3.2 Places (Карта) — `src/data/places.ts`
```prisma
model Place {
  id         String        @id @default(cuid())
  name       String
  category   String        // cafe|restaurant|hotel|guesthouse|resort|park|gym|picnic|tourism
  country    String        // 'kz' | 'tr' | 'ae' (ключи из COUNTRIES)
  city       String        // 'almaty' | 'astana' | ... (ключи городов)
  lat        Float
  lng        Float
  tags       String[]      // halal|no_alcohol|clean|kids_zone|family|prayer_room
  highlights String
  hours      String        // "09:00–23:00" | "Круглосуточно"
  approved   Boolean       @default(false) // "Divergents Approved"
  addedBy    String
  photo      String?
  reviews    PlaceReview[]
}
model PlaceReview {
  id      String @id @default(cuid())
  placeId String
  author  String
  rating  Int    // 0..5
  text    String
  date    String
  place   Place  @relation(fields: [placeId], references: [id])
}
```
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/places` | нет/Clerk |
| POST | `/api/mobile/places` | Clerk (клиент уже шлёт) |
| POST | `/api/mobile/places/:id/review` | Clerk (опц.) |
| POST | `/api/mobile/places/:id/report` | Clerk (опц.) |

Ответ: `{ places: ApiPlace[] }`, где `ApiPlace = { id, name, category, country,
city, lat, lng, tags[], highlights, hours, approved, addedBy, photo?,
reviews: { id, author, rating, text, date }[] }`.

### 3.3 Notifications — `src/data/notifications.ts`
```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String   // Clerk userId получателя
  kind        String   // challenge|course|community|place|career|system
  title       String
  body        String
  date        String   // отображается клиентом как есть
  targetTab   String?  // 'LMSTab'|'CommunityTab'|'CareerTab'|'MapTab'
  targetScreen String?
  targetParams Json?    // { [k]: string }
  readAt      DateTime?
  createdAt   DateTime @default(now())
}
```
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/notifications` | Clerk |
| POST | `/api/mobile/notifications/read` | Clerk (опц.) |

Ответ: `{ notifications: ApiNotification[] }`, где `ApiNotification = { id, kind,
title, body, date, target?: { tab, screen, params?: Record<string,string> } }`.
`icon`/`color` клиент проставляет сам по `kind`.

### 3.4 Активный челлендж + leaderboard — `src/data/community.ts`
Сейчас `fetchActiveChallenge()` возвращает `{ challenge: null, members: [] }` —
у сервера нет модели ежедневных задач и подсчёта баллов по команде.
```prisma
model ChallengeEntry {            // участие пользователя в активном челлендже
  id          String   @id @default(cuid())
  challengeId String
  teamId      String
  userId      String   // Clerk userId
  nickname    String   // ≤ 9 символов
  joinedAt    DateTime @default(now())
  days        ChallengeDay[]
}
model ChallengeDay {             // отчёт за день (для подсчёта баллов)
  id        String @id @default(cuid())
  entryId   String
  dayIndex  Int     // 1..21
  steps     Int     @default(0)
  pages     Int     @default(0)
  noSugar   Boolean @default(false)
  points    Int     @default(0) // итог за день (база + бонус)
  entry     ChallengeEntry @relation(fields: [entryId], references: [id])
}
```
| Метод | Путь | Auth |
|------|------|------|
| GET | `/api/mobile/me/challenges/active` | Clerk |
| POST | `/api/mobile/me/challenges/active/day` | Clerk (отчёт за день) |

Ответ — точный view-model (`ActiveChallengeData`, маппинг не нужен):
```ts
{
  challenge: {
    id, title, teamName, totalDays /* 21 */, currentDay /* 1..21 */,
    members /* в команде */, startedLabel /* "5 авг" */,
    teamRank, teamCount, trainer, price,
    tasks: [
      // metric: 10 000 шагов
      { id:'steps',  kind:'metric', title, icon:'figure.walk', unit:'шагов',
        min:10000, current, basePts:10, unitSize:100, ptsPerUnit:1 },
      // binary: день без сахара
      { id:'sugar',  kind:'binary', title, icon:'cube.fill', done, basePts:10 },
      // metric: 10 страниц
      { id:'reading',kind:'metric', title, icon:'book.fill', unit:'стр.',
        min:10, current, basePts:10, unitSize:1, ptsPerUnit:2 }
    ]
  } | null,
  members: [ { id, name, weekBase /* баллы без сегодня */, day /* день участника */, isMe? } ]
}
```
Подсчёт баллов — на сервере (правила: норма 10 000 шагов / 20 стр. / без сахара,
штрафы и 🚩 по `CHALLENGE_RULES` в `community.ts`). `tasks[].current`/`done`
заполняются из сегодняшнего `ChallengeDay` пользователя. Если активного участия
нет — вернуть `{ challenge: null, members: [] }`.

> Прочее без серверной модели и держится пустым по дизайну: спорт-активности
> (`fetchSport`) и онлайн-лекции (`fetchLectures`) — добавить эндпоинты при
> необходимости.
</content>
</invoke>
