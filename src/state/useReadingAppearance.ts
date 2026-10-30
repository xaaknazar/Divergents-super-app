import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_READING_APPEARANCE, parseReadingAppearance, ReadingAppearance } from '../data/readingAppearance';
import { readJSON, saveJSON } from './persist';

// A device preference, never a challenge setting or private participant data.
const KEY = 'dvg.readingAppearance.v1';
let current = DEFAULT_READING_APPEARANCE;
let revision = 0;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => current;

export function loadReadingAppearance(): Promise<void> {
  if (!loading) {
    const atStart = revision;
    loading = readJSON<unknown>(KEY, DEFAULT_READING_APPEARANCE).then(result => {
      if (result.ok && revision === atStart) { current = parseReadingAppearance(result.value); notify(); }
      if (!result.ok) loading = undefined;
    });
  }
  return loading;
}
export async function setReadingAppearance(patch: Partial<ReadingAppearance>) {
  // Hydrate both fields before saving a partial choice. Never replace unread settings.
  await loadReadingAppearance();
  if (!loading) throw new Error('Не удалось прочитать оформление. Повторите выбор.');
  const previous = current;
  const writeRevision = ++revision;
  current = parseReadingAppearance({ ...current, ...patch });
  notify();
  try { await saveJSON(KEY, current, { strict: true }); }
  catch (error) {
    // A failed write must not look saved after navigating away from the gallery.
    if (revision === writeRevision) { current = previous; notify(); }
    throw error;
  }
}
export function useReadingAppearance() {
  const appearance = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => { void loadReadingAppearance(); }, []);
  return { appearance, setAppearance: setReadingAppearance };
}
