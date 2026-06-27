// Tiny JSON persistence on top of expo-secure-store.
import * as SecureStore from 'expo-secure-store';

// SecureStore stores values in the platform keychain/keystore. On Android the
// practical per-value limit is ~2KB; warn in development when we exceed it so
// large collections are caught before they silently fail to persist.
const SIZE_WARN_BYTES = 2000;

// UTF-8 byte length. `String.length` counts UTF-16 units, which undercounts the
// keychain footprint for Cyrillic (2 bytes/char) — so the size warning would
// fire too late. Count actual encoded bytes instead.
function utf8Bytes(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { bytes += 4; i++; } // surrogate pair
    else bytes += 3;
  }
  return bytes;
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await SecureStore.getItemAsync(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

export async function saveJSON(key: string, val: unknown): Promise<void> {
  try {
    const payload = JSON.stringify(val);
    const bytes = utf8Bytes(payload);
    if (__DEV__ && bytes > SIZE_WARN_BYTES) {
      console.warn(
        `[persist] saveJSON("${key}") payload is ${bytes} bytes, ` +
        `which exceeds SecureStore's ~${SIZE_WARN_BYTES}-byte Android limit and may fail to persist.`,
      );
    }
    await SecureStore.setItemAsync(key, payload);
  } catch {}
}

// Delete a set of keys (e.g. on sign-out). Individual failures are swallowed so
// one missing/locked key never blocks clearing the rest.
export async function clearKeys(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try { await SecureStore.deleteItemAsync(key); } catch {}
    }),
  );
}
