import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { fetchReadingDetail, ReadingApiError, sendReadingCommand, type ReadingDetail } from '../data/reading';
import { fetchReadingApplicant, type ReadingApplicant } from '../data/readingApplicants';

type Decision = 'approved' | 'rejected';
type Operation = { context: string; memberId: string; decision: Decision; operationId: string };
type State = { context: string; loading: boolean; data?: ReadingDetail; error?: string;
  selectedId?: string; applicant?: ReadingApplicant; profileLoading: boolean; profileError?: string;
  busy: boolean; pendingDecision?: Decision; decisionError?: string; message?: string };
const empty = (context: string): State => ({ context, loading: true, profileLoading: false, busy: false });
const message = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

/** Review-only screen: never starts or recovers a native Reading timer. */
export function useReadingApplicants(challengeId: string) {
  const { userId, getToken } = useAuth(), auth = useRef({ userId, getToken }); auth.current = { userId, getToken };
  const context = `${userId ?? ''}:${challengeId}`, current = useRef(context); current.current = context;
  const alive = useRef(false), loadSequence = useRef(0), profileSequence = useRef(0);
  const selected = useRef<{ context: string; id: string } | undefined>(undefined);
  const pending = useRef<Operation | undefined>(undefined), inFlight = useRef<string | undefined>(undefined);
  const [stored, setStored] = useState<State>(() => empty(context));
  const state = stored.context === context ? stored : empty(context);
  const stateRef = useRef(state); stateRef.current = state;
  const update = (change: Partial<State>) => setStored(s => ({ ...(s.context === context ? s : empty(context)), ...change }));
  const valid = () => alive.current && current.current === context;

  const reload = useCallback(async () => {
    const request = ++loadSequence.current;
    setStored(s => ({ ...(s.context === context ? s : empty(context)), loading: true, error: undefined }));
    try {
      const token = await auth.current.getToken();
      if (!alive.current || current.current !== context) return;
      const data = await fetchReadingDetail(token, challengeId);
      if (!alive.current || current.current !== context || request !== loadSequence.current) return;
      setStored(s => ({ ...(s.context === context ? s : empty(context)), data, loading: false, error: undefined }));
      // Losing a team role removes its pending applications from the response.
      if (selected.current?.context === context && !data.applications.some(a => a.id === selected.current?.id)) {
        selected.current = undefined; profileSequence.current++;
        setStored(s => ({ ...s, selectedId: undefined, applicant: undefined, profileError: undefined, profileLoading: false }));
      }
    } catch (e) {
      if (alive.current && current.current === context && request === loadSequence.current) {
        const denied = e instanceof ReadingApiError && [401, 403, 404].includes(e.status);
        if (denied) { selected.current = undefined; profileSequence.current++; }
        setStored(s => ({ ...(s.context === context ? s : empty(context)), loading: false,
          error: message(e, 'Не удалось загрузить заявки.'), ...(denied ? { data: undefined, applicant: undefined, selectedId: undefined } : {}) }));
      }
    }
  }, [context, challengeId]);
  useFocusEffect(useCallback(() => {
    alive.current = true;
    // A request may have settled while this screen was unfocused. Its receipt
    // can still be checked, but a stale busy flag must not lock the page.
    setStored(s => ({ ...(s.context === context ? s : empty(context)), busy: !!inFlight.current && pending.current?.context === context }));
    void reload();
    return () => {
      alive.current = false; loadSequence.current++; profileSequence.current++; selected.current = undefined;
      setStored(s => ({ ...s, applicant: undefined, selectedId: undefined, profileLoading: false, profileError: undefined }));
    };
  }, [reload]));

  const select = async (memberId: string) => {
    if (inFlight.current || !stateRef.current.data?.applications.some(a => a.id === memberId)) return;
    const request = ++profileSequence.current;
    selected.current = { context, id: memberId };
    update({ selectedId: memberId, applicant: undefined, profileLoading: true, profileError: undefined, message: undefined });
    try {
      const token = await auth.current.getToken();
      if (!valid() || profileSequence.current !== request) return;
      const applicant = await fetchReadingApplicant(token, challengeId, memberId);
      if (valid() && profileSequence.current === request && selected.current?.id === memberId) {
        update({ applicant, profileLoading: false });
      }
    } catch (e) {
      if (valid() && profileSequence.current === request) update({ profileLoading: false, profileError: message(e, 'Не удалось загрузить анкету.') });
    }
  };
  const close = () => {
    selected.current = undefined; profileSequence.current++;
    update({ selectedId: undefined, applicant: undefined, profileLoading: false, profileError: undefined });
  };
  const decide = async (memberId: string, decision: Decision) => {
    const prior = pending.current?.context === context ? pending.current : undefined;
    if (inFlight.current || (!prior && !stateRef.current.data?.applications.some(a => a.id === memberId))) return;
    // Unknown delivery must be resolved using the same request, not overwritten
    // by the opposite decision or by a different applicant's command.
    if (prior && (prior.memberId !== memberId || prior.decision !== decision)) return;
    const operation = prior ?? { context, memberId, decision, operationId: Crypto.randomUUID() };
    pending.current = operation; inFlight.current = operation.operationId;
    update({ busy: true, pendingDecision: decision, decisionError: undefined, message: undefined });
    try {
      const token = await auth.current.getToken();
      if (!valid()) return;
      await sendReadingCommand(token, { action: 'review', challengeId, memberId, decision, operationId: operation.operationId });
      if (!valid()) return;
      pending.current = undefined; selected.current = undefined; profileSequence.current++;
      update({ selectedId: undefined, applicant: undefined, profileLoading: false, pendingDecision: undefined,
        message: decision === 'approved' ? 'Участник принят в команду.' : 'Заявка отклонена.' });
      await reload();
    } catch (e) {
      if (!valid()) return;
      const final = e instanceof ReadingApiError && [400, 401, 403, 404, 409].includes(e.status);
      if (final) pending.current = undefined;
      update({ pendingDecision: final ? undefined : decision, decisionError: message(e, 'Нет подтверждения сервера. Проверьте решение повторно.') });
      if (final) await reload();
    } finally {
      if (inFlight.current === operation.operationId) inFlight.current = undefined;
      if (valid()) update({ busy: false });
    }
  };
  return { ...state, reload, select, close, decide,
    retryProfile: () => { if (state.selectedId) void select(state.selectedId); },
    retryDecision: () => { const op = pending.current; if (op?.context === context) void decide(op.memberId, op.decision); },
  };
}
