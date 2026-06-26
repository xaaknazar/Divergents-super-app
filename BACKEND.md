# BACKEND.md — серверные эндпоинты для Divergents Super App

После релиз-фиксов мобильное приложение стало **API-driven**: фейковые/брендовые
mock-данные убраны, экраны грузят контент с сервера и показывают пустое состояние,
если данных нет. Чтобы ты (как админ) мог публиковать контент, а пользователи его
видели, на сайте **divergents-lms.kz** нужно поднять перечисленные ниже эндпоинты
под префиксом `/api/mobile`.

## Общие правила
- **База:** `https://divergents-lms.kz` (константа `API_BASE` в `src/config.ts`).
- **Auth:** защищённые эндпоинты принимают `Authorization: Bearer <Clerk session token>`.
  Приложение шлёт токен через `getToken()` из Clerk. Сервер должен верифицировать
  токен и резолвить пользователя по Clerk `userId` / email.
- **Публичные** (каталог, открытые челленджи) — без токена.
- **Формат:** JSON. На ошибках возвращать корректный HTTP-код; приложение
  деградирует в пустое/ошибочное состояние и не падает.
- **Точные shape-ы** полей смотри в TypeScript-типах в `src/data/*.ts`
  (`Vacancy`, `Trip`, `Channel`, `Challenge`, `Place`, `NotificationItem` и т.д.) —
  держи ответ совместимым с ними.

---

## LMS / Обучение  (уже существуют — оставить)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/courses` | нет | Публичный каталог опубликованных курсов |
| GET | `/api/mobile/courses/:id` | нет | Деталь курса (free-chapter HLS) |
| GET | `/api/mobile/me/courses` | Clerk | Купленные курсы + прогресс пользователя |
| GET | `/api/mobile/me/courses/:id` | Clerk | Деталь купленного курса (все HLS) |
| POST | `/api/mobile/me/courses/:id/progress` | Clerk | **(новое, опц.)** Синк завершения урока на сервер. Body: `{ lessonId, completed }` |

## Talentslab / Career-профиль  (talentslab.org, уже частично есть)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/profile` | Clerk Bearer (приоритет) / `X-App-Key`+email (опц.) | Профиль кандидата: Gallup/MBTI/Gardner/отчёты, `completeness`, `live:true` |
| POST | `/api/mobile/resume` | Clerk Bearer / `X-App-Key`+email | Сохранить ответы анкеты резюме. Body: `{ answers }` |

> Безопасность: хардкод-ключ `X-App-Key` убран из бандла. Приоритетный путь —
> Clerk-токен. Чтобы полностью отказаться от `X-App-Key`, сервер Talentslab должен
> принимать Clerk Bearer и резолвить кандидата из проверенной сессии (см.
> RELEASE-CHECKLIST).

## Career / Вакансии  (НОВОЕ — нужно реализовать)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/vacancies` | нет/Clerk | Список вакансий. `[]` если нет. Shape: тип `Vacancy` в `src/data/career.ts` |
| GET | `/api/mobile/vacancies/:id` | нет/Clerk | Деталь вакансии |
| POST | `/api/mobile/vacancies/:id/apply` | Clerk | **(опц.)** Отклик на вакансию |
| GET | `/api/mobile/me/applications` | Clerk | **(опц.)** Отклики/сохранённые пользователя |

## Community  (НОВОЕ — нужно реализовать)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/community/challenges` | нет | Список челленджей |
| GET | `/api/mobile/community/challenges/active` | Clerk | Активный 21-дневный челлендж пользователя + прогресс |
| GET | `/api/mobile/community/teams` | Clerk | Команды / leaderboard |
| GET | `/api/mobile/community/channels` | Clerk | Каналы (только бесплатные — платный канал убран из v1) |
| GET | `/api/mobile/community/posts` | Clerk | Посты канала (статьи/аудио). Реальные медиа-URL, не sample |
| GET | `/api/mobile/community/lectures` | нет | Лекции |
| GET | `/api/mobile/community/trips` | нет | Поездки. Shape: тип `Trip` в `src/data/community.ts` |
| GET | `/api/mobile/community/trips/:id` | нет | Деталь поездки |
| GET | `/api/mobile/community/sport` | нет | Спорт-активности |
| POST | `/api/mobile/community/trips/:id/join` | Clerk | **(опц.)** Запись на поездку (обновляет going/spots) |

## Map / Места  (НОВОЕ — нужно реализовать)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/places` | нет/Clerk | Список мест сообщества. Shape: тип `Place` в `src/data/places.ts` |
| POST | `/api/mobile/places` | Clerk | **Добавить место** (чтобы его видели все пользователи, а не только локально на устройстве) |
| POST | `/api/mobile/places/:id/review` | Clerk | **(опц.)** Отзыв о месте |
| POST | `/api/mobile/places/:id/report` | Clerk | **(опц.)** «Сообщить о проблеме» |

> Сейчас «Добавить место» сохраняет место **локально на устройстве** (фото
> копируется в постоянное хранилище). Чтобы добавленные места видели другие
> пользователи — клиент должен POST-ить их на `/api/mobile/places`.

## Notifications  (НОВОЕ — нужно реализовать)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| GET | `/api/mobile/notifications` | Clerk | Уведомления пользователя. Shape: тип в `src/data/notifications.ts` |
| POST | `/api/mobile/notifications/read` | Clerk | **(опц.)** Отметить прочитанными |

## AI  (НОВОЕ — нужно реализовать; LLM на сервере, не в приложении)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| POST | `/api/mobile/ai` | Clerk | Чат с ассистентом. Body: `{ messages }`. Ответ — текст ассистента (приложение само имитирует стриминг) |

## Account  (НОВОЕ — требование сторов)
| Метод | Путь | Auth | Назначение |
|------|------|------|-----------|
| DELETE | `/api/mobile/me` | Clerk | Серверное удаление данных пользователя (LMS-прогресс, резюме Talentslab, отклики, места). Вызывается вместе с Clerk `user.delete()` из экрана профиля |

---

### Приоритет внедрения
1. **Account deletion** + **Talentslab Clerk-auth** — требования безопасности/сторов.
2. **vacancies / places / community / notifications** — чтобы модули показывали
   реальный контент вместо пустых состояний.
3. **ai** — если AI-таб идёт в релиз; иначе скрыть таб.
4. Опциональные POST-эндпоинты (apply/join/review/report/progress) — для интерактива.
