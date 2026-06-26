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

// Fallback auth for the Talentslab mobile API (X-App-Key + email) used when the
// Clerk-token path isn't available. NOTE: this key ships in the app bundle and
// can read any candidate by email — acceptable for an internal app, but prefer
// Clerk-only auth in production. Override via EXPO_PUBLIC_TALENTSLAB_APP_KEY.
export const TALENTSLAB_APP_KEY =
  process.env.EXPO_PUBLIC_TALENTSLAB_APP_KEY || 'd200c5a5f643d4c7fffe0207ac75a361535970cc6604db40';


// MapLibre style URL for the offline-capable map. The default (MapLibre demo
// tiles) works without a key but is low-detail. For street-level maps AND
// offline downloads, set EXPO_PUBLIC_MAP_STYLE_URL to a MapTiler/Stadia style
// URL that includes your API key, e.g.
//   https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';
