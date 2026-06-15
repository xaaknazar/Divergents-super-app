# Divergents Super App — context for AI-assisted development

React Native + Expo (TypeScript) mobile app for the Divergents personal-development
ecosystem. iOS HIG (Apple) aesthetic, brand navy `#234088`.

## Architecture (important)
- **Client-only app.** No LLM calls, DB access, or secrets in this repo.
- Real data comes from the **Divergents LMS website API** (Next.js on
  `https://divergents-lms.kz`). The mobile app is a client, like a browser:
  it reads JSON from the site and loads images (UploadThing `utfs.io`) and
  video (Mux HLS) directly from their CDNs.
- Auth: **Clerk** (email-code). Only the *publishable* key (public) is in the
  app (`src/config.ts`). Secret keys live server-side on Vercel — never here.

## Mobile API (added on the website, under /api/mobile)
- `GET /api/mobile/courses` — public published catalog
- `GET /api/mobile/courses/:id` — public course detail (free-chapter HLS only)
- `GET /api/mobile/me/courses` — Clerk-auth: user's owned courses + progress
- `GET /api/mobile/me/courses/:id` — Clerk-auth: owned detail, all chapters HLS
- Discussion reuses the site's `/api/courses/:id/chapters/:cid/comments`

## Layout
- `src/theme` — tokens (colors, type scale, radius, space)
- `src/components` — SF icons, ui atoms, headers, cards, Logo
- `src/navigation` — bottom tabs + per-module native stacks
- `src/data` — api client + mock fallback data
- `src/state` — CourseContext (catalog+progress), ChallengeContext, useMyCourses
- `src/screens` — lms / community / ai / career / profile

## Conventions
- Strict TypeScript. Run `npm run typecheck` before committing.
- All user-facing text is Russian.
- Graceful degradation: if the website API is unreachable, fall back to mock
  data (`source: 'mock'`) instead of crashing.
- `.npmrc` has `legacy-peer-deps=true` (Clerk + React 19).

## Deep modules
- **LMS (Обучение):** live courses, owned "Мои курсы" with progress, course
  detail, video player (notes / materials / discussion tabs).
- **Community:** 21-day challenge with over-goal bonus points → live leaderboard.

## Run
`npm install` → `npx expo start -c` → Expo Go (SDK 54).
