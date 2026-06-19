// App configuration.
//
// CLERK_PUBLISHABLE_KEY is a PUBLIC key (it ships in the website's frontend
// too) — safe to embed in the app. Paste your key below OR set the env var
// EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY before running.
//
// Get it from Vercel → divergents-lms project → Environment Variables →
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (starts with pk_live_ or pk_test_).
export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_live_Y2xlcmsuZGl2ZXJnZW50cy1sbXMua3ok';

export const API_BASE = 'https://divergents-lms.kz';

// Talentslab (резюме + Gallup/MBTI/Гарднер + отчёты). The mobile API is served
// by the Talentslab Laravel app. Override via EXPO_PUBLIC_TALENTSLAB_BASE.
// The app authenticates with the user's Clerk session token (Bearer); the
// Talentslab endpoint must verify it and resolve the candidate by email.
export const TALENTSLAB_BASE =
  process.env.EXPO_PUBLIC_TALENTSLAB_BASE || 'https://talentslab.org';
