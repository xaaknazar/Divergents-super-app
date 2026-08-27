// Offline AUDIO download manager for purchased lessons.
//
// Persists a small registry (lessonId -> metadata) via state/persist and stores
// the actual m4a files under the app's document directory. Uses the legacy
// expo-file-system API (createDownloadResumable) for progress callbacks.
//
// A tiny external store (subscribe/notify) backs the `useDownloads()` hook so
// every screen (CourseDetail, Downloads, Video) sees the same live state.
import { useEffect, useState } from 'react';
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { loadJSON, saveJSON } from './persist';

const STORE_KEY = 'downloads.audio.v1';
const DIR = `${documentDirectory ?? ''}downloads/`;

export interface DownloadRecord {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  n?: number;
  localUri: string;
  size: number; // bytes
  at: number; // epoch ms
}

// Caller-supplied context for a download (the owned flag gates everything).
export interface DownloadInput {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  n?: number;
  owned: boolean;
}

// An in-flight download's metadata, so the Downloads screen can list it while
// it's still downloading (not just after it completes).
interface PendingMeta { lessonId: string; courseId: string; courseTitle: string; title: string; n?: number }
export interface PendingDownload extends PendingMeta { progress: number }

// ─── External store ────────────────────────────────────────────────
let registry: Record<string, DownloadRecord> = {};
let progress: Record<string, number> = {}; // lessonId -> 0..1 while in flight
// The live resumable tasks (so a download can be cancelled) + their metadata.
// These live at module scope, so a download keeps running when the user leaves
// the lesson screen — it only stops when completed or explicitly cancelled.
const tasks: Record<string, ReturnType<typeof createDownloadResumable>> = {};
let pendingMeta: Record<string, PendingMeta> = {};
let ready = false;
let loadStarted = false;

const subs = new Set<() => void>();
function notify() { subs.forEach((fn) => fn()); }
function subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }

async function persist() { await saveJSON(STORE_KEY, registry); }

async function ensureDir() {
  try {
    const info = await getInfoAsync(DIR);
    if (!info.exists) await makeDirectoryAsync(DIR, { intermediates: true });
  } catch {}
}

async function load() {
  if (loadStarted) return;
  loadStarted = true;
  const saved = await loadJSON<Record<string, DownloadRecord>>(STORE_KEY, {});
  // Drop entries whose underlying file vanished (e.g. OS cleared the sandbox).
  const checked: Record<string, DownloadRecord> = {};
  await Promise.all(
    Object.values(saved || {}).map(async (rec) => {
      try {
        const info = await getInfoAsync(rec.localUri);
        if (info.exists) checked[rec.lessonId] = rec;
      } catch {
        checked[rec.lessonId] = rec; // keep on a transient stat failure
      }
    }),
  );
  // Merge rather than replace: a download may have completed and written into
  // `registry` while this async load was in flight — wholesale assignment would
  // drop it. Disk-checked entries fill in anything not already present live.
  registry = { ...checked, ...registry };
  ready = true;
  notify();
  if (Object.keys(checked).length !== Object.keys(saved || {}).length) persist();
}
// Kick off the initial load as soon as the module is imported.
load();

// ─── Module-level API ──────────────────────────────────────────────
export function isDownloaded(lessonId: string): boolean {
  return !!registry[lessonId];
}

export function localUriFor(lessonId: string): string | null {
  return registry[lessonId]?.localUri ?? null;
}

export function downloadProgress(lessonId: string): number | undefined {
  return progress[lessonId];
}

export function isDownloading(lessonId: string): boolean {
  return progress[lessonId] !== undefined;
}

// Download a lesson's audio. Returns true on success. Graceful on any failure
// (network, 404 while Mux still renders the rendition, missing dir): cleans up
// the partial file and resolves false so the caller can offer a retry.
export async function downloadLesson(input: DownloadInput, audioUrl?: string | null): Promise<boolean> {
  if (!input.owned) return false; // only purchased/owned courses
  if (!audioUrl || !documentDirectory) return false;
  if (registry[input.lessonId]) return true; // already have it
  if (progress[input.lessonId] !== undefined) return false; // already in flight

  const localUri = `${DIR}${safeName(input.lessonId)}.m4a`;
  progress[input.lessonId] = 0;
  pendingMeta[input.lessonId] = {
    lessonId: input.lessonId, courseId: input.courseId, courseTitle: input.courseTitle, title: input.title, n: input.n,
  };
  notify();

  try {
    await ensureDir();
    const task = createDownloadResumable(audioUrl, localUri, {}, (data) => {
      const total = data.totalBytesExpectedToWrite;
      const frac = total > 0 ? data.totalBytesWritten / total : 0;
      progress[input.lessonId] = Math.max(0, Math.min(1, frac));
      notify();
    });
    tasks[input.lessonId] = task;
    const result = await task.downloadAsync();
    // A cancel resolves downloadAsync() with undefined — treat as "stopped", not
    // an error (the file was already cleaned up by cancelDownload).
    if (!result) { clearPending(input.lessonId); notify(); return false; }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`HTTP ${result.status}`);
    }
    let size = 0;
    try {
      const info = await getInfoAsync(localUri);
      size = info.exists ? info.size : 0;
    } catch {}
    registry[input.lessonId] = {
      lessonId: input.lessonId,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      title: input.title,
      n: input.n,
      localUri,
      size,
      at: Date.now(),
    };
    clearPending(input.lessonId);
    notify();
    await persist();
    return true;
  } catch {
    clearPending(input.lessonId);
    try { await deleteAsync(localUri, { idempotent: true }); } catch {}
    notify();
    return false;
  }
}

// Clear the in-flight bookkeeping for a lesson (progress / task / metadata).
function clearPending(lessonId: string) {
  delete progress[lessonId];
  delete tasks[lessonId];
  delete pendingMeta[lessonId];
}

// Stop an in-flight download the user started. Cancels the resumable task,
// removes the partial file, and clears its progress. Safe if nothing's running.
export async function cancelDownload(lessonId: string): Promise<void> {
  const task = tasks[lessonId];
  clearPending(lessonId);
  notify();
  if (task) { try { await task.cancelAsync(); } catch {} }
  try { await deleteAsync(`${DIR}${safeName(lessonId)}.m4a`, { idempotent: true }); } catch {}
}

export async function removeDownload(lessonId: string): Promise<void> {
  const rec = registry[lessonId];
  delete registry[lessonId];
  delete progress[lessonId];
  notify();
  if (rec) {
    try { await deleteAsync(rec.localUri, { idempotent: true }); } catch {}
  }
  await persist();
}

// Replace characters that are unsafe in a file name (lesson ids are usually
// cuids, but guard anyway).
function safeName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ─── React hook ────────────────────────────────────────────────────
export interface UseDownloads {
  ready: boolean;
  items: DownloadRecord[]; // completed, newest first
  pending: PendingDownload[]; // in-flight (still downloading)
  progress: Record<string, number>;
  downloadLesson: typeof downloadLesson;
  removeDownload: typeof removeDownload;
  cancelDownload: typeof cancelDownload;
  isDownloaded: (lessonId: string) => boolean;
  isDownloading: (lessonId: string) => boolean;
  localUriFor: (lessonId: string) => string | null;
}

export function useDownloads(): UseDownloads {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const items = Object.values(registry).sort((a, b) => b.at - a.at);
  const pending = Object.values(pendingMeta).map((m) => ({ ...m, progress: progress[m.lessonId] ?? 0 }));
  return {
    ready,
    items,
    pending,
    progress: { ...progress },
    downloadLesson,
    removeDownload,
    cancelDownload,
    isDownloaded: (id) => !!registry[id],
    isDownloading: (id) => progress[id] !== undefined,
    localUriFor: (id) => registry[id]?.localUri ?? null,
  };
}
