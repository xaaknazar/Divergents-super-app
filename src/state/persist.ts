// JSON persistence with two storage tiers:
//   - SecureStore for small flags/preferences;
//   - the app's private document sandbox for collections and large payloads.
// Existing SecureStore JSON is migrated lazily on first read. Per-key writes are
// serialized so an older async write cannot finish last and restore stale state.
import * as SecureStore from 'expo-secure-store';
import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

const FILE_MARKER = '@dvg-file-v1';
const FILE_MARKER_PREFIX = `${FILE_MARKER}:`;
const FILE_DIR = `${documentDirectory ?? ''}dvg-state/`;
const SECURE_STORE_MAX_BYTES = 1800;

// These collections/PII can grow beyond keychain limits. Keep their location
// stable even while they are still small.
const FILE_BACKED_KEYS = new Set([
  'ai.history.v1',
  'dvg.workouts.v1',
  'dvg.resume',
  'dvg.completed',
  'dvg.enrollments',
  'dvg.userPlaces',
  'dvg.placeReviews',
  'dvg.mapRecent',
  'downloads.audio.v1',
]);

const queues = new Map<string, Promise<void>>();

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

/**
 * Чтение с честным признаком неудачи.
 *
 * `loadJSON` возвращает fallback и при «ничего не сохранено», и при сбое чтения
 * — по такому ответу нельзя решить, можно ли перезаписывать ключ. Из-за этого
 * история чата стиралась: одно неудачное чтение выглядело как «истории нет», и
 * следующее сохранение затирало файл пустотой.
 */
export async function readJSON<T>(key: string, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    await queues.get(key)?.catch(() => {});
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) return { value: fallback, ok: true }; // пусто — это успешное чтение
    if (stored === FILE_MARKER || stored.startsWith(FILE_MARKER_PREFIX)) {
      if (!documentDirectory) return { value: fallback, ok: false };
      const slot = stored.startsWith(FILE_MARKER_PREFIX) ? stored.slice(FILE_MARKER_PREFIX.length) : 'legacy';
      if (slot !== 'a' && slot !== 'b' && slot !== 'legacy') return { value: fallback, ok: false };
      return { value: JSON.parse(await readAsStringAsync(fileUri(key, slot))) as T, ok: true };
    }
    const parsed = JSON.parse(stored) as T;
    // Lazy migration from the old all-SecureStore implementation.
    if (FILE_BACKED_KEYS.has(key) || utf8Bytes(stored) > SECURE_STORE_MAX_BYTES) {
      await saveJSON(key, parsed);
    }
    return { value: parsed, ok: true };
  } catch (error) {
    if (__DEV__) console.warn(`[persist] Failed to load "${key}"`, error);
    return { value: fallback, ok: false };
  }
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  return (await readJSON(key, fallback)).value;
}

export async function saveJSON(key: string, val: unknown): Promise<void> {
  const payload = JSON.stringify(val) ?? 'null';
  await enqueue(key, async () => {
    try {
      const useFile = FILE_BACKED_KEYS.has(key) || utf8Bytes(payload) > SECURE_STORE_MAX_BYTES;
      if (useFile && await ensureFileDir()) {
        // Alternate two files. The marker keeps pointing at the previous complete
        // slot until the replacement is fully written, so a process kill cannot
        // leave the active payload half-written.
        const previousMarker = await SecureStore.getItemAsync(key);
        const previousSlot = previousMarker === `${FILE_MARKER_PREFIX}a` ? 'a'
          : previousMarker === `${FILE_MARKER_PREFIX}b` ? 'b'
            : previousMarker === FILE_MARKER ? 'legacy' : null;
        const nextSlot = previousSlot === 'a' ? 'b' : 'a';
        await writeAsStringAsync(fileUri(key, nextSlot), payload);
        await SecureStore.setItemAsync(key, `${FILE_MARKER_PREFIX}${nextSlot}`);
        if (previousSlot) await deleteAsync(fileUri(key, previousSlot), { idempotent: true }).catch(() => {});
      } else {
        await SecureStore.setItemAsync(key, payload);
        await deleteFileForKey(key);
      }
    } catch (error) {
      // Preserve the existing no-throw contract used by fire-and-forget setters,
      // but make failures visible during development.
      if (__DEV__) console.warn(`[persist] Failed to save "${key}"`, error);
    }
  });
}

// Enqueuing deletion after pending saves prevents a slow older write from
// recreating data after sign-out/account deletion.
export async function clearKeys(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => enqueue(key, async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(key).catch(() => {}),
      deleteFileForKey(key),
    ]);
  })));
}

function enqueue(key: string, operation: () => Promise<void>): Promise<void> {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  queues.set(key, current);
  return current.finally(() => {
    if (queues.get(key) === current) queues.delete(key);
  });
}

function fileName(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const readable = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  return `${readable}-${(hash >>> 0).toString(16)}.json`;
}

function fileUri(key: string, slot: 'a' | 'b' | 'legacy'): string {
  const suffix = slot === 'legacy' ? '' : `.${slot}`;
  return `${FILE_DIR}${fileName(key)}${suffix}`;
}

async function ensureFileDir(): Promise<boolean> {
  if (!documentDirectory) return false;
  try {
    const info = await getInfoAsync(FILE_DIR);
    if (!info.exists) await makeDirectoryAsync(FILE_DIR, { intermediates: true });
    return true;
  } catch {
    return false;
  }
}

async function deleteFileForKey(key: string): Promise<void> {
  if (!documentDirectory) return;
  await Promise.all((['a', 'b', 'legacy'] as const).map((slot) =>
    deleteAsync(fileUri(key, slot), { idempotent: true }).catch(() => {}),
  ));
}
