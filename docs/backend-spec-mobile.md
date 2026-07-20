# Divergents Mobile — ТЗ для бэкенда

Контракты, которые ждёт мобильное приложение (Expo/React Native). База: `https://divergents-lms.kz`.
Авторизация — **Clerk**: приложение шлёт `Authorization: Bearer <clerk_session_jwt>`.
Сервер резолвит пользователя по токену (по email/`sub`), проверяет роль.

Все ответы — JSON. Ошибки: приложение трактует не-2xx как сбой; для «нет доступа» —
корректный статус (401/403), для «не найдено» — 404.

---

## 1. НОВОЕ — создание вакансии (нужно реализовать)

Приложение уже вызывает этот эндпоинт (экран «Новая вакансия», роль-гейт `canCreate`).

**`POST /api/mobile/vacancies`** — создать вакансию. Требует роль (проверять на сервере).

Request body:
```json
{
  "title": "HR-менеджер",
  "company": "KEX Group",
  "city": "Алматы",
  "format": "Офис",            // "Офис" | "Гибрид" | "Удалёнка"
  "salary": "от 500 000 ₸",
  "level": "Middle",
  "about": "Описание роли…",
  "requirements": ["Опыт от 2 лет", "Excel", "Английский B2"]
}
```
Response (200/201):
```json
{ "id": "vac_123" }
```
- Если пользователь без прав → **403**.
- После создания вакансия должна попадать в выдачу `GET /api/mobile/vacancies`.
- Опционально: серверные поля `match/talents/goodBoss/goodCompany/reason` рассчитываются на бэке.

---

## 2. НОВОЕ — реакции на посты каналов (нужно реализовать)

Сейчас реакции в приложении **локальные** (только на устройстве). Чтобы были общими:

**`POST /api/mobile/channels/:channelId/posts/:postId/react`**
```json
{ "emoji": "🔥" }   // повторный тот же emoji = снять реакцию (toggle)
```
Response:
```json
{ "reactions": { "👍": 12, "❤️": 3, "🔥": 8 }, "myReaction": "🔥" }
```

И включить реакции в объект поста при `GET /api/mobile/channels`:
```json
{
  "id": "post_1", "type": "audio", "title": "…", "audioUrl": "…", "createdAt": "…",
  "reactions": { "👍": 12, "🔥": 8 },   // счётчики
  "myReaction": "🔥"                     // реакция текущего пользователя (или null)
}
```
Набор эмодзи в приложении: `👍 ❤️ 🔥 👏 🙏` (можно расширить на сервере).

---

## 3. Уведомления + Push (сейчас не работают, т.к. сервер их не эмитит)

Приложение **только показывает** то, что отдаёт сервер, и принимает пуши.
Оно НЕ генерирует уведомления само. Нужно, чтобы сервер:

### 3.1. Отдавал ленту уведомлений
**`GET /api/mobile/notifications`** (Clerk-auth):
```json
{
  "notifications": [
    {
      "id": "n1",
      "kind": "course",                 // "challenge"|"course"|"community"|"place"|"career"|"system"
      "title": "Новый курс: Лидерство",
      "body": "В каталоге появился новый курс.",
      "date": "2026-07-20T10:00:00Z",   // ISO
      "target": {                       // куда вести по тапу (см. 3.3)
        "tab": "LMSTab",
        "screen": "CourseDetail",
        "params": { "courseId": "course_42" }
      }
    }
  ]
}
```
(`icon`/`color` можно не слать — приложение подставит по `kind`.)

### 3.2. СОЗДАВАЛ уведомления на события (главное!)
Сервер должен создавать уведомление + слать push **подписчикам/адресатам** при:
- **Новый курс опубликован** → всем (или сегменту) `kind:"course"`, target → `CourseDetail`.
- **Новый пост/аудио в канале** → **подписчикам канала** `kind:"community"`, target → `ServerChannel` (`{ channelId }`).
- **Новая вакансия под профиль** → пользователю `kind:"career"`, target → `VacancyDetail` (`{ jobId }`).
- **Одобрение запроса в канал / оффер / статус отклика** → адресату.
- **Челлендж: старт/напоминание дня** → участникам `kind:"challenge"`, target → `ChallengeDetail`.

### 3.3. Формат push (Expo Push)
Приложение регистрирует Expo-token (см. 4). Пуш — через Expo Push API, с **`data.target`** той же формы, что в ленте:
```json
{
  "to": "ExponentPushToken[…]",
  "title": "Новый пост в канале «Women's club»",
  "body": "Голосовое сообщение",
  "data": { "target": { "tab": "CommunityTab", "screen": "ServerChannel", "params": { "channelId": "ch_7" } } }
}
```
Тап по пушу → приложение открывает нужный экран по `target`. Без `target` → просто откроет список уведомлений.

**Справочник `target`** (tab → screen → params):
| Событие | tab | screen | params |
|---|---|---|---|
| Курс | `LMSTab` | `CourseDetail` | `{ courseId }` |
| Книга | `LMSTab` | `BookDetail` | `{ bookId }` |
| Канал/пост | `CommunityTab` | `ServerChannel` | `{ channelId }` |
| Челлендж | `CommunityTab` | `ChallengeDetail` | `{ challengeId }` |
| Поездка | `CommunityTab` | `TripDetail` | `{ tripId }` |
| Вакансия | `CareerTab` | `VacancyDetail` | `{ jobId }` |
| Место | `MapTab` | `PlaceDetail` | `{ placeId }` |
| Системное | — | — | (без target → откроется список) |

---

## 4. Push-токен: регистрация есть, нужна ОТПИСКА

- **Есть:** `POST /api/mobile/push/register` `{ token, platform }` (Clerk-auth) — приложение уже шлёт Expo-token при входе.
- **НУЖНО:** `POST /api/mobile/push/unregister` `{ token }` — приложение будет звать при выходе, чтобы старый пользователь не получал пуши на этом устройстве (иначе адресация «протекает» между аккаунтами на общем устройстве).

---

## 5. Роль (уже используется, проверить)

**`GET /api/mobile/me/role`** (Clerk-auth) → `{ "canCreate": true, "email": "…" }`.
- `canCreate:true` открывает в приложении **создание каналов и вакансий**. Выставляется по роли на сервере.

---

## 6. Справочник — эндпоинты, которые приложение УЖЕ вызывает

Приложение рассчитывает, что они существуют и отвечают в описанной форме (проверить/подтвердить):

| Эндпоинт | Назначение |
|---|---|
| `GET /api/mobile/courses`, `/courses/:id` | каталог курсов, деталь |
| `GET /api/mobile/me/courses`, `/me/courses/:id`, `/me/courses/:id/progress` | купленные курсы + прогресс (HLS открывается только владельцу) |
| `GET /api/mobile/books`, `/books/:id`, `/me/books` | книги |
| `GET /api/mobile/vacancies`, `/vacancies/:id`; `POST /vacancies/:id/apply` | вакансии + отклик |
| `GET /api/mobile/challenges`, `/challenges/active`; `POST /challenges/:id/apply`, `/challenges/:id/progress` | челленджи |
| `GET /api/mobile/trips`, `/me/trips`; `POST /trips/:id/apply` | поездки |
| `GET /api/mobile/sport`, `/me/sport` | спорт |
| `GET /api/mobile/channels`, `/me/channels`; `POST /channels/:id/join`; `GET/PATCH /channels/:id/requests`; `DELETE /channels/:id/members`; `POST /channels/:id/posts`; invite: `/channels/invite/*` | каналы (Telegram-стиль) |
| `GET /api/mobile/places`, `POST /places`, `/places/:id/report` | места на карте |
| `POST /api/mobile/upload` | загрузка файлов (аудио/фото) — multipart, поле `file`; ответ `{ url }` |
| `POST /api/mobile/ai` | AI-ассистент (работает) |
| `GET/POST /api/mobile/profile`, `/api/mobile/resume` (Talentslab) | профиль талантов + анкета |

---

## Приоритеты
1. **Уведомления + push** (п.3, п.4) — сейчас не работают вообще.
2. **POST /api/mobile/vacancies** (п.1) — экран в приложении готов.
3. **Реакции на посты** (п.2) — UI готов, сейчас локальный.
