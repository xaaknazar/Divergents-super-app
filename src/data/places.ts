// Community places & ratings ("2GIS для своих"). Divergents drop pins for cafes,
// hotels, tourism spots etc. with community-values tags; others rate & comment.
//
// The live list is published server-side (admin) and fetched from the website
// API; there is NO hardcoded seed content. On failure or empty the fetch
// returns [] and screens render a Russian empty state — never fake data.
import { SFName } from '../components/SFIcon';
import { API_BASE } from '../config';

export type PlaceCategory =
  | 'cafe' | 'restaurant' | 'hotel' | 'guesthouse' | 'resort' | 'park' | 'gym' | 'picnic' | 'tourism';

export const CATEGORY_META: Record<PlaceCategory, { label: string; icon: SFName; color: string }> = {
  cafe:       { label: 'Кафе',        icon: 'cart.fill',        color: '#C2410C' },
  restaurant: { label: 'Ресторан',    icon: 'cart.fill',        color: '#B45309' },
  hotel:      { label: 'Отель',       icon: 'building.2.fill',  color: '#4338CA' },
  guesthouse: { label: 'Гостевой дом', icon: 'house.fill',      color: '#0E7490' },
  resort:     { label: 'База отдыха', icon: 'leaf.fill',        color: '#047857' },
  park:       { label: 'Парк',        icon: 'leaf.fill',        color: '#16A34A' },
  gym:        { label: 'Спортзал',    icon: 'figure.run',       color: '#BE123C' },
  picnic:     { label: 'Пикник',      icon: 'flame.fill',       color: '#EA580C' },
  tourism:    { label: 'Туризм',      icon: 'mappin.and.ellipse', color: '#0369A1' },
};
export const CATEGORIES = Object.keys(CATEGORY_META) as PlaceCategory[];

export type PlaceTag = 'halal' | 'no_alcohol' | 'clean' | 'kids_zone' | 'family' | 'prayer_room';
export const TAG_META: Record<PlaceTag, { label: string; icon: SFName }> = {
  halal:       { label: 'Халяль',        icon: 'checkmark.seal.fill' },
  no_alcohol:  { label: 'Без алкоголя',  icon: 'xmark' },
  clean:       { label: 'Чисто',         icon: 'sparkles' },
  kids_zone:   { label: 'Детская зона',  icon: 'figure.2.and.child.holdinghands' },
  family:      { label: 'Для семьи',     icon: 'heart.fill' },
  prayer_room: { label: 'Намазхана',     icon: 'moon.fill' },
};
export const TAGS = Object.keys(TAG_META) as PlaceTag[];

export interface Review { id: string; author: string; rating: number; text: string; date: string }

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  country: string;   // country key
  city: string;      // city key
  lat: number;
  lng: number;
  tags: PlaceTag[];
  highlights: string; // "Вкусный колд брю, тихо, есть розетки"
  hours: string;      // "09:00–23:00"
  approved: boolean;  // Divergents Approved
  addedBy: string;
  photo?: string | null;
  reviews: Review[];
}

export interface City { key: string; name: string; lat: number; lng: number }
export interface Country { key: string; name: string; cities: City[] }

export const COUNTRIES: Country[] = [
  { key: 'kz', name: 'Казахстан', cities: [
    { key: 'almaty', name: 'Алматы', lat: 43.2380, lng: 76.8829 },
    { key: 'astana', name: 'Астана', lat: 51.1605, lng: 71.4704 },
    { key: 'shymkent', name: 'Шымкент', lat: 42.3174, lng: 69.5901 },
    { key: 'oskemen', name: 'Усть-Каменогорск', lat: 49.9714, lng: 82.6059 },
  ]},
  { key: 'tr', name: 'Турция', cities: [
    { key: 'istanbul', name: 'Стамбул', lat: 41.0082, lng: 28.9784 },
  ]},
  { key: 'ae', name: 'ОАЭ', cities: [
    { key: 'dubai', name: 'Дубай', lat: 25.2048, lng: 55.2708 },
  ]},
];

export function cityCenter(country: string, city: string): City | undefined {
  return COUNTRIES.find((c) => c.key === country)?.cities.find((ci) => ci.key === city);
}
// Never-undefined center: falls back to the first known city if the requested
// country/city is missing (e.g. a stale persisted filter). Use this instead of
// `cityCenter(...)!` so the UI can't crash on bad/legacy stored values.
export function safeCityCenter(country: string, city: string): City {
  return cityCenter(country, city) ?? COUNTRIES[0].cities[0];
}
// True only when country/city resolve to a real known city.
export function isKnownCity(country: string, city: string): boolean {
  return !!cityCenter(country, city);
}
export function nearestCity(lat: number, lng: number): { country: string; city: string } | null {
  let best: { country: string; city: string } | null = null;
  let bestD = Infinity;
  for (const co of COUNTRIES) {
    for (const ci of co.cities) {
      const d = (lat - ci.lat) ** 2 + (lng - ci.lng) ** 2;
      if (d < bestD) { bestD = d; best = { country: co.key, city: ci.key }; }
    }
  }
  return best;
}

export function citiesOf(country: string): City[] {
  return COUNTRIES.find((c) => c.key === country)?.cities ?? [];
}

// ─── Live places API ──────────────────────────────────────────────────────
// Real, admin-published places fetched from the website. No local seed data.
interface ApiReview { id?: string; author?: string; rating?: number; text?: string; date?: string }
interface ApiPlace {
  id?: string; name?: string; category?: string; country?: string; city?: string;
  lat?: number; lng?: number; tags?: string[]; highlights?: string; hours?: string;
  approved?: boolean; addedBy?: string; photo?: string | null; reviews?: ApiReview[];
}

const VALID_CATS = new Set<string>(CATEGORIES);
const VALID_TAGS = new Set<string>(TAGS);

function mapReview(r: ApiReview, i: number): Review {
  return {
    id: String(r.id ?? `sr_${i}`),
    author: String(r.author ?? 'Участник'),
    rating: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0))),
    text: String(r.text ?? ''),
    date: String(r.date ?? ''),
  };
}

function mapApiPlace(p: ApiPlace): Place | null {
  if (!p || !p.id || typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
  if (!isFinite(p.lat) || !isFinite(p.lng)) return null;
  const category = (VALID_CATS.has(String(p.category)) ? p.category : 'cafe') as PlaceCategory;
  const tags = (Array.isArray(p.tags) ? p.tags : []).filter((t) => VALID_TAGS.has(t)) as PlaceTag[];
  const reviews = (Array.isArray(p.reviews) ? p.reviews : []).map(mapReview);
  return {
    id: String(p.id),
    name: String(p.name ?? ''),
    category,
    country: String(p.country ?? ''),
    city: String(p.city ?? ''),
    lat: p.lat,
    lng: p.lng,
    tags,
    highlights: String(p.highlights ?? ''),
    hours: String(p.hours ?? ''),
    approved: !!p.approved,
    addedBy: String(p.addedBy ?? 'Сообщество'),
    photo: p.photo ?? null,
    reviews,
  };
}

// Fetch the live, admin-published catalog of places. Returns [] on any
// failure (network, non-2xx, bad JSON) so callers render an empty state
// instead of crashing or showing stale fake data.
export async function fetchPlaces(timeoutMs = 12000): Promise<Place[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/places`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ApiPlace[] = Array.isArray(data) ? data : Array.isArray(data?.places) ? data.places : [];
    return list.map(mapApiPlace).filter((p): p is Place => p !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

// POST a user-added place so other users can see it once the admin approves it.
// Best-effort: returns the created place id (or null on failure). The on-device
// "add place" flow keeps working regardless via PlacesContext local storage.
export async function postPlace(
  body: Omit<Place, 'id' | 'reviews' | 'approved'>,
  token?: string | null,
  timeoutMs = 12000,
): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/places`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// POST a review so other users can see it. Best-effort: the local optimistic
// review (PlacesContext) is shown regardless. Returns true only on a real 2xx
// (the caller may surface "synced" vs "saved locally" feedback honestly).
export async function postReview(
  placeId: string,
  body: { rating: number; text: string },
  token?: string | null,
  timeoutMs = 12000,
): Promise<boolean> {
  if (!placeId) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/places/${encodeURIComponent(placeId)}/review`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

// Report a place to moderators. Returns true on a real 2xx so the UI can tell
// the user honestly whether the report reached the server (vs. failed). The
// endpoint is optional server-side (see BACKEND.md); on failure the caller
// surfaces a retry/error message instead of a fake "thanks".
export async function reportPlace(
  placeId: string,
  reason: string,
  token?: string | null,
  timeoutMs = 12000,
): Promise<boolean> {
  if (!placeId) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/mobile/places/${encodeURIComponent(placeId)}/report`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}


// Open-now status from an hours string like "09:00–23:00" or "Круглосуточно".
export interface OpenInfo { known: boolean; open: boolean; label: string }
export function isOpenNow(hours: string, now: Date = new Date()): OpenInfo {
  const h = (hours || '').toLowerCase();
  if (!h) return { known: false, open: false, label: '' };
  if (h.includes('круглосут')) return { known: true, open: true, label: 'Открыто · круглосуточно' };
  const m = h.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return { known: false, open: false, label: '' };
  const o = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  let c = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  const cur = now.getHours() * 60 + now.getMinutes();
  const overnight = c <= o;
  const open = overnight ? (cur >= o || cur < c) : (cur >= o && cur < c);
  const pad = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
  if (open) {
    let left = (overnight && cur >= o ? c + 1440 : c) - cur;
    if (left < 0) left += 1440;
    return { known: true, open: true, label: left <= 60 ? `Закроется через ${left} мин` : `Открыто до ${pad(c % 1440)}` };
  }
  return { known: true, open: false, label: `Закрыто · откроется в ${pad(o)}` };
}
