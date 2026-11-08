import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { EventKind } from '../data/community';
import { fetchApplicantActivity, type ApplicantActivity } from '../data/applicantActivity';
import { ApplicantActivityReport } from './ApplicantActivityReport';

/** Mounted only for an authorized selected application. Never persist someone else's history. */
export function EventApplicantActivity({ kind, eventId, applicationId, completeness }: {
  kind: EventKind; eventId: string; applicationId: string; completeness: number | null;
}) {
  const { userId, getToken } = useAuth();
  const tokenRef = useRef(getToken); tokenRef.current = getToken;
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{ key: string; state: 'loading' | 'ready' | 'error'; data: ApplicantActivity | null } | null>(null);
  const key = JSON.stringify([userId, kind, eventId, applicationId, attempt]);
  useEffect(() => {
    let current = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort();
      if (current) setResult({ key, state: 'error', data: null });
    }, 15000);
    setResult({ key, state: 'loading', data: null });
    void (async () => {
      try {
        const token = await tokenRef.current();
        if (!current || ctrl.signal.aborted) return;
        const data = await fetchApplicantActivity(kind, eventId, applicationId, token, ctrl.signal);
        if (current && !ctrl.signal.aborted) setResult({ key, state: 'ready', data });
      } catch { if (current) setResult({ key, state: 'error', data: null }); }
      finally { clearTimeout(timer); }
    })();
    return () => { current = false; ctrl.abort(); clearTimeout(timer); };
  }, [key, kind, eventId, applicationId]);
  const visible = result?.key === key ? result : null;
  return <ApplicantActivityReport activity={visible?.data ?? null} state={visible?.state ?? 'loading'}
    completeness={completeness} onRetry={() => retry(n => n + 1)} />;
}
