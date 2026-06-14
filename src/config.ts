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
