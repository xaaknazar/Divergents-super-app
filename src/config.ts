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

// OPTIONAL fallback auth for the Talentslab mobile API (X-App-Key + email),
// used only when no Clerk session token is available. Clerk-token (Bearer) auth
// is the preferred and primary path — see src/data/talentslab.ts. This key, if
// set, ships in the app bundle and can read any candidate by email, so it MUST
// NOT be hardcoded here; provide it only via the env var when truly needed.
// Defaults to '' (disabled) so the app relies on Clerk-token auth.
export const TALENTSLAB_APP_KEY = process.env.EXPO_PUBLIC_TALENTSLAB_APP_KEY || '';


// MapLibre style URL for the offline-capable map. When unset (''), the map code
// falls back to the MapLibre demo/no-key behavior (low-detail tiles, no API key
// required). For street-level maps AND offline downloads, set
// EXPO_PUBLIC_MAP_STYLE_URL to a MapTiler/Stadia style URL that includes your
// API key, e.g. https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL || '';
