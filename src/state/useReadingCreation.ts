import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import { ReadingApiError, sendReadingCommand } from '../data/reading';
import { ReadingChallengeDraft, ReadingChallengeDraftSchema, ReadingPublication, ReadingPublicationSchema, readingDateError } from '../data/readingCreation';
import { readJSON, saveJSON } from './persist';

type CreationState = { phase: 'loading' | 'editing' | 'pending' | 'success' | 'blocked';
  publication?: ReadingPublication; draft?: ReadingChallengeDraft; challengeId?: string; error?: string };
const activeAccounts = new Set<string>();
export function useReadingCreation() {
  const { userId, getToken } = useAuth();
  const auth = useRef({ userId, getToken }); auth.current = { userId, getToken };
  const account = userId ?? '', key = `dvg.readingCreate.${account}`;
  const [owned, setOwned] = useState<{ account: string; state: CreationState }>({ account, state: { phase: 'loading' } });
  const state = owned.account === account ? owned.state : { phase: 'loading' as const };
  const setState = (value: CreationState) => setOwned({ account, state: value });
  const [busy, setBusy] = useState(false), generation = useRef(0);
  const retainedDraft = useRef<{ account: string; draft: ReadingChallengeDraft } | undefined>(undefined);
  const load = useCallback(async () => {
    const gen = ++generation.current;
    const current = () => gen === generation.current && auth.current.userId === account;
    setOwned({ account, state: { phase: 'loading' } }); setBusy(false);
    if (!account) { setOwned({ account, state: { phase: 'blocked', error: 'Войдите в аккаунт, чтобы создать челлендж.' } }); return; }
    try {
      const saved = await readJSON<unknown>(key, null);
      if (!saved.ok) throw new Error('Не удалось прочитать публикацию');
      const publication = saved.value === null ? undefined : ReadingPublicationSchema.parse(saved.value);
      if (current()) setOwned({ account, state: publication ? { phase: 'pending', publication }
        : { phase: 'editing', draft: retainedDraft.current?.account === account ? retainedDraft.current.draft : undefined } });
    } catch { if (current()) setOwned({ account, state: { phase: 'blocked', error: 'Не удалось прочитать сохранённую публикацию. Повторите проверку. Сохранённые данные не удалены.' } }); }
  }, [account, key]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const submit = async (draft?: ReadingChallengeDraft) => {
    if (!account || activeAccounts.has(account) || (state.phase !== 'editing' && state.phase !== 'pending')) return;
    activeAccounts.add(account); setBusy(true);
    if (draft) retainedDraft.current = { account, draft };
    const gen = generation.current;
    const current = () => gen === generation.current && auth.current.userId === account;
    let publication: ReadingPublication | undefined;
    let durable = false;
    try {
      const stored = await readJSON<unknown>(key, null);
      if (!stored.ok) throw new Error('Не удалось прочитать предыдущую публикацию. Повторите проверку.');
      if (!current()) return;
      publication = stored.value === null ? undefined : ReadingPublicationSchema.parse(stored.value);
      durable = !!publication;
      if (publication && draft) { setState({ phase: 'pending', publication }); return; }
      if (!publication) {
        if (!draft) { setState({ phase: 'editing' }); return; }
        const checked = ReadingChallengeDraftSchema.parse(draft);
        const invalidDate = readingDateError(checked.startDate, Date.now(), checked.mode);
        if (invalidDate) throw new Error(invalidDate);
        publication = { operationId: Crypto.randomUUID(), draft: checked };
        await saveJSON(key, publication, { strict: true });
        durable = true;
      }
      if (!current()) return;
      setState({ phase: 'pending', publication });
      const token = await auth.current.getToken();
      if (!current()) return;
      const result = await sendReadingCommand(token, { action: 'create', operationId: publication.operationId, ...publication.draft });
      if (!result.challengeId) throw new Error('Сервер не вернул номер созданного челленджа. Проверьте публикацию повторно.');
      // Strict tombstone: failed deletion must not resurrect a previous publication.
      await saveJSON(key, null, { strict: true });
      if (current()) { retainedDraft.current = undefined; setState({ phase: 'success', publication, challengeId: result.challengeId }); }
    } catch (e) {
      if (!current()) return;
      const message = e instanceof ReadingApiError ? e.message : e instanceof Error && /[А-Яа-яЁё]/.test(e.message) ? e.message
        : durable ? 'Нет подтверждения сервера. Запрос сохранён. Нажмите «Проверить публикацию», когда связь восстановится.'
          : 'Не удалось сохранить или прочитать запрос на телефоне. Публикация не отправлена. Повторите проверку.';
      if (publication && e instanceof ReadingApiError && [400, 403].includes(e.status)) {
        try {
          await saveJSON(key, null, { strict: true });
          if (current()) setState({ phase: 'editing', draft: publication.draft, error: e.message });
        } catch { if (current()) setState({ phase: 'pending', publication, error: 'Не удалось обновить сохранённую публикацию. Повторите проверку.' }); }
      } else setState(publication && durable ? { phase: 'pending', publication, error: message }
        : { phase: 'blocked', draft, error: message });
    } finally { activeAccounts.delete(account); if (current()) setBusy(false); }
  };
  return { state, busy: owned.account === account && busy, submit, reload: load };
}
