# Talentslab → Divergents Super App: спецификация мобильного API

Приложение «Карьера» (раздел «Моя анкета и оценки») тянет профиль кандидата
из Talentslab и отправляет заполненную анкету обратно. Связка пользователя —
**по email**, который сервер берёт из проверенного токена сессии (НЕ из тела
запроса — так безопаснее).

Базовый адрес настраивается в приложении: `EXPO_PUBLIC_TALENTSLAB_BASE`
(по умолчанию `https://talentslab.kz`).

---

## Аутентификация

Приложение шлёт заголовок:

```
Authorization: Bearer <clerk_session_jwt>
Accept: application/json
```

Это тот же Clerk, что и в LMS-сайте (`divergents-lms`). На стороне Talentslab нужно:

1. Проверить JWT через Clerk JWKS (issuer/публичные ключи Clerk).
2. Достать из токена email пользователя (`email` / `primary_email`).
3. Найти кандидата: `Candidate::where('email', $email)->first()`.
4. Если не найден — вернуть `{ "found": false }` (200), приложение покажет пустое состояние «Заполните анкету».

> Если поднять проверку Clerk JWT на Laravel пока сложно — на первом этапе можно
> временно принимать `?email=` + общий секрет в заголовке `X-App-Key`, но это менее
> безопасно. Целевой вариант — проверка токена.

---

## 1) GET `/api/mobile/profile`

Возвращает профиль текущего пользователя: статус анкеты, Gallup, MBTI, Гарднер, отчёты.

**Ответ 200 (application/json):**

```json
{
  "found": true,
  "fullName": "Иван Иванов",
  "email": "ivan@example.com",
  "phone": "+7 700 000 00 00",
  "currentCity": "Алматы",
  "photoUrl": "https://talentslab.kz/storage/photos/123.jpg",
  "resumeStep": 5,
  "completeness": 100,
  "mbtiType": "ENFJ",
  "gallup": [
    { "rank": 1, "name": "Достижение",       "domain": "executing" },
    { "rank": 2, "name": "Командование",      "domain": "influencing" },
    { "rank": 3, "name": "Стратегия",         "domain": "strategic" },
    { "rank": 4, "name": "Индивидуализация",  "domain": "relationship" }
  ],
  "gardner": [
    { "category": "Межличностный", "score": 92 },
    { "category": "Логико-математический", "score": 78 }
  ],
  "reports": [
    { "type": "gallup",       "title": "Gallup — полный отчёт (34 таланта)", "url": "https://talentslab.kz/.../gallup.pdf" },
    { "type": "gallup_short", "title": "Gallup — краткая зона роста",         "url": "https://talentslab.kz/.../short.pdf" },
    { "type": "gardner",      "title": "Гарднер — множественный интеллект",   "url": "https://talentslab.kz/.../gardner.pdf" }
  ]
}
```

Поля и источники в Talentslab:
- `resumeStep` — `candidates.step` (0..5, 5 = завершена).
- `completeness` — % заполненности (можно посчитать по непустым полям резюме).
- `mbtiType` — `candidates.mbti_type`.
- `gallup[]` — из `GallupTalent` / `gallup_report_sheets`, отсортировано по рангу.
  `domain` ∈ `executing` | `influencing` | `relationship` | `strategic`
  (Исполнение / Влияние / Построение отношений / Стратегическое мышление).
- `gardner[]` — из `GardnerTestResult.results` (нормировать `score` к 0..100).
- `reports[]` — публичные/подписанные ссылки на PDF (`gallup_pdf`, `short_area_pdf_file`,
  Gardner). Лучше отдавать временные signed URL.

Поля могут отсутствовать/быть `null` — приложение это переносит.

---

## 2) POST `/api/mobile/resume`

Создаёт или обновляет резюме кандидата (upsert по email из токена).

**Тело запроса:**

```json
{
  "answers": {
    "full_name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+7 700 000 00 00",
    "gender": "Мужской",
    "marital_status": "Холост/Не замужем",
    "birth_date": "01.01.1995",
    "birth_place": "Алматы",
    "current_city": "Алматы",
    "citizenship": "Казахстан",
    "ready_to_relocate": true,
    "instagram": "@ivan",

    "religion": "—",
    "is_practicing": false,
    "hobbies": "...",
    "interests": "...",
    "visited_countries": ["Турция", "ОАЭ"],
    "favorite_sports": ["Футбол"],
    "books_per_year": "12",
    "educational_hours_weekly": "10",
    "entertainment_hours_weekly": "8",
    "social_media_hours_weekly": "14",
    "has_driving_license": true,

    "school": "Школа №1, Алматы, 2012",
    "universities": "...",
    "language_skills": ["Английский B2", "Казахский C1"],
    "computer_skills": "...",
    "work_experience": "...",
    "total_experience_years": "6",
    "job_satisfaction": "8",
    "desired_position": "HR-директор",
    "activity_sphere": "HR",
    "awards": "...",
    "expected_salary_from": "1000000",
    "expected_salary_to": "1500000",
    "employer_requirements": "...",

    "mbti_type": "ENFJ"
  }
}
```

Ключи `answers` 1:1 совпадают с `candidates` (массивы — `visited_countries`,
`favorite_sports`, `language_skills`). На сервере смаппить в `Candidate` и сохранить
(валидация + `step`/`completeness` пересчитать).

**Ответ:** `200 OK` (тело не обязательно). Любой не-2xx → приложение покажет
«сохранено локально, отправим позже».

---

## Как это выглядит в приложении (уже готово)

- Раздел **Карьера → «Моя анкета и оценки»**: прогресс заполнения, кнопка
  «Заполнить/Редактировать анкету», топ-5 талантов Gallup (с цветом домена),
  тип MBTI, топ-категории Гарднера, список отчётов (открываются по ссылке).
- **Анкета** — 4 шага, повторяют форму Talentslab; данные сохраняются локально
  и отправляются на `POST /api/mobile/resume`.
- Пока API не поднят, приложение показывает демо-профиль с пометкой «демо».
  Как только эндпоинты заработают — данные подхватятся автоматически.

После реализации эндпоинтов прогоните: вход в приложение под почтой, у которой
есть кандидат в Talentslab → раздел Карьера должен показать реальные Gallup/MBTI/Гарднер.
