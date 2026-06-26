# RELEASE-CHECKLIST.md — что осталось до публикации в App Store / Google Play

Код-блокеры из аудита устранены (ветка `release-readiness-fixes`, `tsc --noEmit`
проходит чисто). Ниже — то, что **код сделать не мог** и требует твоих действий:
реальные ключи, артворк, серверная часть и конфигурация сторов.

## 1. Ассеты (сейчас плейсхолдеры — заменить на брендовые)
- [ ] `assets/icon.png` — 1024×1024 (сейчас сплошной navy `#234088`).
- [ ] `assets/adaptive-icon.png` — 1024×1024 foreground для Android.
- [ ] `assets/splash.png` — сплеш-экран (сейчас сплошной navy).
- Пути уже прописаны в `app.json` — достаточно заменить файлы.

## 2. Ключи и секреты (env / `app.json`)
- [ ] **Google Maps Android API key** — в `app.json`
      `expo.android.config.googleMaps.apiKey` сейчас плейсхолдер
      `REPLACE_WITH_GOOGLE_MAPS_ANDROID_KEY`. Без него карта на Android в
      release-сборке будет пустой. Ограничить ключ по package `kz.divergents.app` + SHA-1.
- [ ] **MapTiler key** — `EXPO_PUBLIC_MAP_STYLE_URL` (хардкод убран из `config.ts`).
      Без него карта/офлайн-тайлы недоступны. Ограничить по origin/bundle.
- [ ] **Talentslab app key** — `EXPO_PUBLIC_TALENTSLAB_APP_KEY`. Лучше **не задавать**
      и перейти на Clerk-only (см. BACKEND.md), т.к. любой EXPO_PUBLIC-ключ
      всё равно попадает в бинарник. Утёкший старый ключ — **ротировать на сервере**.
- [ ] Подтвердить, что `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — это **prod** (`pk_live_`).

## 3. EAS submit (в `eas.json` сейчас плейсхолдеры)
- [ ] iOS: `submit.production.ios.ascAppId` и `appleTeamId` — заменить `REPLACE_*`.
- [ ] Android: положить Play service-account JSON и указать путь
      `serviceAccountKeyPath` (сейчас `./REPLACE-play-service-account.json`),
      трек `internal` для первой заливки.
- [ ] `build.production.autoIncrement` включён — проверить версию/билд-номер.

## 4. Серверная часть (см. BACKEND.md)
- [ ] Реализовать эндпоинты `/api/mobile/...` (vacancies, community, places,
      notifications, ai) — иначе модули будут показывать пустые состояния.
- [ ] `DELETE /api/mobile/me` — серверное удаление данных при удалении аккаунта.
- [ ] Talentslab: принимать Clerk Bearer (чтобы убрать `X-App-Key` полностью).
- [ ] Опубликовать страницы `/terms` и `/privacy` (ссылки уже ведут на них из Auth).

## 5. Юридическое / сторы
- [ ] Privacy Policy URL в листингах App Store Connect и Google Play Console.
- [ ] App Privacy / Data Safety анкеты (сбор email, геолокации, фото).
- [ ] Permission-строки: проверены iOS NS*UsageDescription (геолокация, фото) и
      Android-пермишены в `app.json` — при необходимости уточнить тексты на русском.
- [ ] Возрастной рейтинг, категории, скриншоты, описания.

## 6. Решения на будущее (вне v1)
- [ ] Платный канал убран из v1. Если вернётся — только через **StoreKit / Google
      Play Billing (IAP)** + серверный энтайтлмент (нельзя обходить, Apple 3.1.1).
- [ ] Шаг-трекинг челленджа: сейчас без HealthKit/Google Fit — подключить реальный
      источник шагов или не заявлять автоматический трекинг.
- [ ] Офлайн-тайлы MapLibre пока не используются основной картой
      (react-native-maps) — отдельная задача, если нужен полноценный офлайн-режим.

## 7. Финальная проверка перед заливкой
- [ ] `npm run typecheck` — чисто.
- [ ] Прогон на **release-сборках** обеих платформ (internal track / TestFlight):
      карта, видео-плеер, вход/выход/удаление аккаунта, пустые состояния модулей.
- [ ] Сменить аккаунт на одном устройстве → убедиться, что данные предыдущего юзера
      не видны (cross-account isolation — пофикшено через `clearAllAppData` + remount по `userId`).
