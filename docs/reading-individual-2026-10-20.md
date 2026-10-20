# Reading challenge — индивидуальный зачёт (20.10.2026)

Новые правила важнее ТЗ «Тишина и бумага» и старого кода с командами. Командный спортивный
челлендж (Divergents challenge) не менялся.

## Приложение (ветка `reading-individual`)
- Не участник: компактный блок челленджа («60 минут в день · N участников»), «Правила» (9 пунктов),
  чекбокс «Я ознакомился(-ась) с правилами челленджа», «Присоединиться» (неактивна без галочки).
- Участник, сверху вниз: навбар «‹ Сообщество»; `ReadingRankLink`; `ReadingBookField`; `ReadingTimer` +
  `ReadingTimerControls` (Старт / Пауза / Возобновить) + форма страниц и статус подхода;
  `ReadingProgressSummary` («Сегодня», строка красного флага, сетка 2×2); `ReadingHistoryLink`;
  `ReadingRules` (свёрнуто, «Правила челленджа · 9»).
- Экран `ReadingRanking` «Рейтинг участников»: строки `ReadingRankRow`, подпись про темп и флаги.
- Пауза → страницы за подход (`saveApproach`: закрыть подход на телефоне → stop → report). Подход
  можно закрыть и до часа (нативный `finish` разрешён на мягкой паузе). «Возобновить» без страниц
  продолжает тот же подход; после сохранения страниц — начинает новый подход с той же книгой.

## Сервер (`~/divergents-lms`, ветка `reading-individual`, коммит a227195, НЕ опубликован)
- `POST /api/mobile/reading-challenges` `{ action: 'join', operationId, challengeId, acceptRules: true }` →
  участник сразу `approved`, `teamId = null`, `approvedAt = now` (личный день 1), `rulesAcceptedAt`.
  Заявка `pending` из старой версии тоже превращается в участие.
- `create`: `teams` необязательны (по умолчанию `[]`).
- Детали челленджа: `format: 'individual'`, `participants`; у участника — `readingDays` (дни с временем),
  `averagePages` (темп), `flags`, `daysParticipated`, `rankingEligible`, `rankingPending`,
  `qualificationDaysLeft`. Сортировка: `averagePages`, затем дольше участие.
- Красный флаг: закрытый день (00:00 Алматы + 15 мин на доставку) с < 60 мин; считается при каждом
  чтении данных — в том числе за дни, когда приложение не открывали. Флаги не исключают.
- `GET /api/mobile/reading-books/verify?title=&author=` (автор необязателен) →
  `{ status: 'found', books: [{ key|null, title, author, coverId?, source: 'catalog' | 'ai' }] }` (до 3) или
  `{ status: 'notFound' }`. Сначала Open Library, потом ИИ (исправляет опечатки, дополняет автора,
  пустой список, если не уверен). Приложение показывает «Эта книга? Название — Автор»: «Да, эта» /
  «Нет, другая книга». Подтверждена книга только после выбора. Лимит 8 поисков в минуту.
  Пока эндпоинта нет на проде (404), приложение предлагает записи каталога из `/reading-books`.
- Схема: `ReadingMember.teamId` nullable, `rulesAcceptedAt` (`prisma db push` при деплое).

## Решения владельца (20.10.2026) — каждое в одном месте
| Решение | Где | Значение |
| --- | --- | --- |
| Средний темп делится на все дни с вступления: пропуск снижает темп | сервер `lib/reading-continuous-policy.ts` → `READING_PACE_DIVISOR` | `'participated'` |
| Новичок попадает в рейтинг через 10 дней | сервер `READING_RANKING_DAYS` | 10 |
| «Старт» только после подтверждения книги | приложение `src/data/reading.ts` → `READING_REQUIRE_VERIFIED_BOOK` | `true` |
