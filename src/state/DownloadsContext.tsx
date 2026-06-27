// Offline audio downloads of purchased course lessons. Files live in the app's
// document directory; metadata persists in secure storage. Works fully offline.
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { loadJSON, saveJSON } from './persist';

export interface DownloadItem {
  key: string;          // `${courseId}:${lessonId}`
  courseId: string;
  courseTitle: string;
  lessonId: string;
  title: string;
  uri: string;          // local file uri
  createdAt: number;
}

interface DownloadsState {
  items: DownloadItem[];
  isDownloaded: (courseId: string, lessonId: string) => boolean;
  get: (courseId: string, lessonId: string) => DownloadItem | undefined;
  downloading: string | null; // key currently downloading
  download: (p: { courseId: string; courseTitle: string; lessonId: string; title: string; audioUrl: string }) => Promise<boolean>;
  remove: (key: string) => Promise<void>;
}

const KEY = 'dvg.downloads.v1';
const DIR = FileSystem.documentDirectory + 'audio/';
const Ctx = createContext<DownloadsState | null>(null);

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => { loadJSON<DownloadItem[]>(KEY, []).then((v) => setItems(Array.isArray(v) ? v : [])); }, []);

  const persist = (n: DownloadItem[]) => { setItems(n); saveJSON(KEY, n); };

  const download = useCallback(async (p: { courseId: string; courseTitle: string; lessonId: string; title: string; audioUrl: string }) => {
    const key = `${p.courseId}:${p.lessonId}`;
    setDownloading(key);
    try {
      try { await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }); } catch {}
      const ext = (p.audioUrl.split('?')[0].split('.').pop() || 'mp3').slice(0, 4);
      const dest = `${DIR}${p.courseId}_${p.lessonId}.${ext}`;
      const res = await FileSystem.downloadAsync(p.audioUrl, dest);
      if (!res?.uri) return false;
      const item: DownloadItem = { key, courseId: p.courseId, courseTitle: p.courseTitle, lessonId: p.lessonId, title: p.title, uri: res.uri, createdAt: Date.now() };
      persist([item, ...items.filter((x) => x.key !== key)]);
      return true;
    } catch { return false; }
    finally { setDownloading(null); }
  }, [items]);

  const remove = useCallback(async (key: string) => {
    const it = items.find((x) => x.key === key);
    if (it) { try { await FileSystem.deleteAsync(it.uri, { idempotent: true }); } catch {} }
    persist(items.filter((x) => x.key !== key));
  }, [items]);

  const value = useMemo<DownloadsState>(() => ({
    items, downloading,
    isDownloaded: (c, l) => items.some((x) => x.key === `${c}:${l}`),
    get: (c, l) => items.find((x) => x.key === `${c}:${l}`),
    download, remove,
  }), [items, downloading, download, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDownloads() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDownloads must be used within DownloadsProvider');
  return c;
}
