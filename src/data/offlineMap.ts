// Per-city offline map packs (MapLibre). Cities are NOT pre-downloaded; the user
// downloads a city on demand from the city picker. Downloaded packs are keyed by
// `cityKey` in their metadata so we can show "скачано / скачать" per city and let
// the dedicated «Офлайн-карта» screen render them without a connection.
//
// MapLibre is a native module — absent in Expo Go. Everything here degrades to a
// no-op / false when it isn't available, so callers can guard the UI on
// `offlineAvailable()`.
import { MAP_STYLE_URL } from '../config';

let ML: any = null;
try { ML = require('@maplibre/maplibre-react-native'); } catch { ML = null; }

// Public MapLibre demo style fallback when no MapTiler/Stadia key is configured.
const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

export function offlineAvailable(): boolean {
  return !!ML?.OfflineManager && !!ML?.Map;
}
export function offlineStyleUrl(): string {
  return MAP_STYLE_URL || DEMO_STYLE;
}
export function offlineHasKey(): boolean {
  return !!MAP_STYLE_URL;
}

// MapLibre may hand metadata back as an object or a JSON string — normalise it.
function readMeta(pack: any): Record<string, any> {
  const m = pack?.metadata;
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m;
}

export async function listOfflinePacks(): Promise<any[]> {
  if (!ML?.OfflineManager?.getPacks) return [];
  try { return (await ML.OfflineManager.getPacks()) ?? []; } catch { return []; }
}

// The pack downloaded for a given city, if any.
export function findCityPack(packs: any[], cityKey: string): any | undefined {
  return packs.find((p) => readMeta(p)?.cityKey === cityKey);
}

export async function deleteOfflinePack(id: string): Promise<void> {
  if (!ML?.OfflineManager?.deletePack) return;
  try { await ML.OfflineManager.deletePack(id); } catch {}
}

export async function deleteCityPack(cityKey: string): Promise<void> {
  const packs = await listOfflinePacks();
  const pack = findCityPack(packs, cityKey);
  // OfflineMapScreen deletes by `pack.id`; fall back to `name` for other versions.
  const id = pack?.id ?? pack?.name;
  if (id) await deleteOfflinePack(id);
}

export interface CityPackTarget { cityKey: string; cityName: string; lat: number; lng: number; km?: number }

// Download one city's tiles. Resolves true on 100%, false on error/stall.
// `createPack` returns immediately; real progress arrives via the callback, and a
// silently-stalled download never errors — so we arm a 25s no-progress watchdog.
export function downloadCityPack(target: CityPackTarget, onProgress?: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ML?.OfflineManager?.createPack) { resolve(false); return; }
    const km = target.km ?? 12;
    const { lat, lng } = target;
    const dLat = km / 111;
    const dLng = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    const bounds: [number, number, number, number] = [lng - dLng, lat - dLat, lng + dLng, lat + dLat];

    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearWatch = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const armWatch = () => {
      clearWatch();
      timer = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 25000);
    };
    const finish = (ok: boolean) => { if (done) return; done = true; clearWatch(); resolve(ok); };

    armWatch();
    try {
      ML.OfflineManager.createPack(
        {
          mapStyle: offlineStyleUrl(),
          bounds,
          minZoom: 10,
          maxZoom: 16,
          metadata: { name: target.cityName, cityKey: target.cityKey, createdAt: Date.now() },
        },
        (_pack: any, status: any) => {
          if (done) return;
          armWatch();
          const pct = Math.round(status?.percentage ?? 0);
          onProgress?.(pct);
          if (pct >= 100) { clearWatch(); finish(true); }
        },
        () => finish(false),
      );
    } catch {
      finish(false);
    }
  });
}
