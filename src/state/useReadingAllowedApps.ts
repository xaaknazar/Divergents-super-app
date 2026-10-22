import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { readingNative, ReadingAllowedAppsStatus } from './readingNative';

/** Account-scoped native choices. Editing never touches the current timer or its frozen exceptions. */
export function useReadingAllowedApps(challengeId: string, sessionId?: string, authorizationReady?: boolean) {
  const { userId } = useAuth();
  const context = `${userId ?? ''}:${challengeId}`;
  const current = useRef({ key: context, version: 0 });
  if (current.current.key !== context) current.current = { key: context, version: current.current.version + 1 };
  const version = current.current.version;
  const currentSession = useRef(sessionId); currentSession.current = sessionId;
  const alive = useRef(true), sequence = useRef(0), editing = useRef<number | null>(null);
  const [state, setState] = useState<{ context: string; supported: boolean; value?: ReadingAllowedAppsStatus; busy: boolean; error?: string }>();
  const active = useCallback(() => alive.current && current.current.key === context && current.current.version === version, [context, version]);
  const load = useCallback(async () => {
    if (!active() || editing.current === version) return;
    if (!userId) { await readingNative.allowedAppsStatus('').catch(() => undefined); return; }
    const request = ++sequence.current;
    try {
      const capabilities = await readingNative.capabilities();
      if (!active() || request !== sequence.current) return;
      if (!capabilities.supportsAllowedApps || capabilities.blockingMode !== 'all-apps') {
        setState({ context, supported: false, busy: false }); return;
      }
      setState(previous => ({ context, supported: true, busy: true, value: previous?.context === context ? previous.value : undefined }));
      const value = await readingNative.allowedAppsStatus(userId);
      if (active() && request === sequence.current) setState({ context, supported: true, value, busy: false });
    } catch (error) {
      if (active() && request === sequence.current) setState(previous => ({ context, supported: previous?.context === context && previous.supported === true,
        value: previous?.context === context ? previous.value : undefined, busy: false,
        error: error instanceof Error ? error.message : 'Не удалось проверить исключения' }));
    }
  }, [active, context, userId, version]);
  useEffect(() => {
    alive.current = true; void load();
    const listener = AppState.addEventListener('change', next => { if (next === 'active') void load(); });
    return () => { alive.current = false; sequence.current++; listener.remove(); };
  }, [load, sessionId, authorizationReady]);
  const choose = async () => {
    if (!userId || !active() || editing.current !== null || state?.context !== context || !state.supported) return;
    if (currentSession.current || state.value?.editable !== true) return;
    editing.current = version; sequence.current++;
    setState(previous => previous?.context === context ? { ...previous, busy: true, error: undefined } : previous);
    try {
      const capabilities = await readingNative.capabilities();
      if (!active() || currentSession.current) return;
      if (!capabilities.supportsAllowedApps || capabilities.blockingMode !== 'all-apps') {
        setState({ context, supported: false, busy: false }); return;
      }
      if (!capabilities.authorized) await readingNative.authorize();
      if (!active() || currentSession.current) return;
      const latest = await readingNative.allowedAppsStatus(userId);
      if (!active() || currentSession.current) return;
      if (!latest.editable) { setState({ context, supported: true, value: latest, busy: false }); return; }
      const value = await readingNative.selectAllowedApps(userId, latest.revision);
      if (active()) setState({ context, supported: true, value, busy: false });
    } catch (error) {
      if (active()) setState(previous => previous?.context === context ? { ...previous, busy: false,
        error: error instanceof Error ? error.message : 'Не удалось сохранить разрешённые приложения' } : previous);
    } finally {
      if (editing.current === version) editing.current = null;
      if (active()) { setState(previous => previous?.context === context ? { ...previous, busy: false } : previous); }
    }
  };
  const visible = state?.context === context && state.supported ? state : undefined;
  return visible ? { count: visible.value?.count ?? null, needsReselection: visible.value?.needsReselection ?? false,
    editable: !sessionId && visible.value?.editable === true, busy: visible.busy, error: visible.error, choose, retry: load } : undefined;
}
