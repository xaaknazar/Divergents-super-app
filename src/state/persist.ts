// Tiny JSON persistence on top of expo-secure-store.
import * as SecureStore from 'expo-secure-store';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await SecureStore.getItemAsync(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

export function saveJSON(key: string, val: unknown): void {
  try { SecureStore.setItemAsync(key, JSON.stringify(val)); } catch {}
}
