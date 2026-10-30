// Local resume answers (persisted) + submit to Talentslab.
// Persisted answers hydrate immediately. Fresh website values replace stale
// local fields except active edits and queued saved changes. Explicit saves go
// through an account-bound outbox, retried on launch/foreground and every minute.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { loadJSON, saveJSON } from './persist';
import { emitProfileChanged, onProfileChanged } from './profileBus';
import { ResumeAnswers, effectiveResumeCompleteness } from '../data/talentslab';
import { mergeResumeFromServer, resumeChanges, resumeFormValues } from '../data/resumeSync';
import { enqueueResume, flushResume, pendingResume, RESUME_OUTBOX } from './resumeSync';
import { REQUIRED_KEYS, RESUME_STEPS } from '../data/resumeSchema';
import { useTalentProfile } from './useTalentProfile';
import { NicknameTakenError } from '../data/nickname';

export type ResumeSaveResult = { ok: true } | { ok: false; reason: 'nickname_taken' | 'sync_unavailable' };

const KEY = 'dvg.resume';
const PENDING = 'dvg.resumePending';
const ALL_KEYS = RESUME_STEPS.flatMap((s) => s.fields.map((f) => f.key));

const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function useResume() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const owner = user?.id ?? null;
  const { profile, live } = useTalentProfile();
  const [answers, setAnswers] = useState<ResumeAnswers>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Есть ли правки, которые ещё не дошли до Talentslab. Локально всё сохранено
  // всегда (setField пишет в хранилище синхронно), поэтому «грязным» считаем
  // только то, что не отправлено на сервер после последнего успешного submit.
  const [dirty, setDirty] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const answersRef = useRef(answers);
  const editedKeys = useRef(new Set<string>());
  const baseline = useRef<ResumeAnswers | null>(null);

  useEffect(() => {
    loadJSON<ResumeAnswers>(KEY, {}).then((v) => {
      // prefill email/full name from Clerk if empty AND already available
      const email = user?.primaryEmailAddress?.emailAddress;
      const next = {
        ...(email && !v.email ? { email } : {}),
        ...(user?.firstName && !v.first_name ? { first_name: user.firstName } : {}),
        ...(user?.lastName && !v.last_name ? { last_name: user.lastName } : {}),
        ...v,
      };
      answersRef.current = next;
      setAnswers(next);
      setHydrated(true);
    });
  }, []);

  // Clerk's `user` often arrives AFTER the mount effect above ran with user=null,
  // so email/full_name would never prefill. Backfill once it's available, without
  // clobbering anything the user has since typed.
  useEffect(() => {
    if (!hydrated || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    setAnswers((p) => {
      const next = { ...p };
      if (email && !p.email) next.email = email;
      if (user.firstName && !p.first_name) next.first_name = user.firstName;
      if (user.lastName && !p.last_name) next.last_name = user.lastName;
      answersRef.current = next;
      return next;
    });
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !owner) return;
    if (!live || !profile?.resume) return;
    let active = true;
    const remote = resumeFormValues(profile.resume);
    Promise.all([pendingResume(owner), loadJSON<boolean>(PENDING, false)]).then(([pending, legacyPending]) => {
      if (!active) return;
      const pendingKeys = pending ? Object.keys(pending.answers) : legacyPending ? Object.keys(answersRef.current) : [];
      const next = mergeResumeFromServer(answersRef.current, remote, [...editedKeys.current, ...pendingKeys]);
      baseline.current = remote;
      answersRef.current = next;
      setAnswers(next);
      void saveJSON(KEY, next);
    }).catch(() => {});
    return () => { active = false; };
  }, [hydrated, live, profile, owner]);

  // Анкету изменили на другом экране — перечитываем сохранённые ответы, чтобы
  // не ждать перезапуска приложения. В хранилище всегда самая свежая версия:
  // setField пишет туда синхронно с каждым изменением поля.
  useEffect(() => onProfileChanged(() => {
    loadJSON<ResumeAnswers>(KEY, {}).then((v) => {
      if (v && Object.keys(v).length) {
        const next = mergeResumeFromServer(answersRef.current, v, editedKeys.current);
        answersRef.current = next;
        setAnswers(next);
      }
    });
  }), []);

  /**
   * `opts.silent` — техническая подстановка (например, подтверждённая почта из
   * Clerk), а не правка человека: она не должна делать анкету «несохранённой».
   */
  const setField = useCallback((key: string, value: any, opts?: { silent?: boolean }) => {
    const next = { ...answersRef.current, [key]: value };
    answersRef.current = next;
    setAnswers(next);
    void saveJSON(KEY, next);
    if (!opts?.silent) { editedKeys.current.add(key); setDirty(true); }
  }, []);

  // Ответы человека вместе с тем, что уже лежит на сервере. Проверять доступ
  // нужно именно по этому объединению: анкету могли заполнить на сайте, и на
  // новом устройстве локальных ответов ещё нет.
  const mergedAnswers: ResumeAnswers = (() => {
    const src: any = live && profile?.resume ? profile.resume : {};
    const out: ResumeAnswers = { ...answers };
    for (const k of ALL_KEYS) if (isEmpty(out[k]) && !isEmpty(src[k])) out[k] = src[k];
    return out;
  })();

  const completeness = (() => {
    // Count a required field as filled if the user has it locally OR the server
    // profile already has it. The mobile form can't represent every complex
    // field (object-arrays are skipped on hydrate), so counting only local
    // answers made the editor read lower (e.g. 93%) than the profile's
    // server-computed value (100%). Align them by also crediting server data.
    const src: any = live && profile?.resume ? profile.resume : {};
    const filled = REQUIRED_KEYS.filter((k) => !isEmpty(answers[k]) || !isEmpty(src[k])).length;
    const localAndFields = Math.round((filled / REQUIRED_KEYS.length) * 100);
    return effectiveResumeCompleteness(profile, localAndFields);
  })();

  // Enqueue before sending, so interruption cannot lose an explicit save.
  const send = useCallback((a: ResumeAnswers, snapshot = a): Promise<boolean> => owner
    ? enqueueResume(owner, a, (opts) => getTokenRef.current(opts), snapshot)
    : Promise.resolve(false), [owner]);

  /**
   * Отправить анкету на Talentslab.
   *
   * `patch` — поля, которые ТОЛЬКО ЧТО ввели и которых ещё нет в состоянии.
   * Это не удобство, а исправление: `setField` обновляет состояние к
   * следующему рендеру, а `submit` из этого же обработчика читает прежнее
   * замыкание. Гейт псевдонима именно так и отправлял анкету БЕЗ псевдонима:
   * человек проходил гейт, у себя видел ник, а остальные — старое ФИО.
   *
   * Берём ответы из рефа, а не из замыкания, по той же причине.
   */
  const submitResult = useCallback(async (patch?: ResumeAnswers): Promise<ResumeSaveResult> => {
    setSubmitting(true);
    try {
      const answers = patch ? { ...answersRef.current, ...patch } : answersRef.current;
      answersRef.current = answers;
      setAnswers(answers);
      await saveJSON(KEY, answers);
      const ok = await send(resumeChanges(answers, baseline.current), answers);
      // The Talentslab profile is cached on-device; drop it so the next read
      // fetches the freshly saved anketa instead of showing stale values.
      if (ok) {
        baseline.current = answers;
        for (const key of editedKeys.current) {
          if (JSON.stringify(answersRef.current[key]) === JSON.stringify(answers[key])) editedKeys.current.delete(key);
        }
        setDirty(editedKeys.current.size > 0);
      }
      // Сообщаем всем экранам, что анкета изменилась — они обновятся сразу,
      // без перезапуска приложения.
      emitProfileChanged();
      // Mirror the name into Clerk so the greeting shows «Имя» and the profile
      // shows «Имя Фамилия».
      try {
        const fn = typeof answers.first_name === 'string' ? answers.first_name.trim() : '';
        const ln = typeof answers.last_name === 'string' ? answers.last_name.trim() : '';
        const params: { firstName?: string; lastName?: string } = {};
        if (fn) params.firstName = fn;
        if (ln) params.lastName = ln;
        if (user && Object.keys(params).length) await user.update(params);
      } catch {}
      return ok ? { ok: true } : { ok: false, reason: 'sync_unavailable' };
    } catch (error) {
      return { ok: false, reason: error instanceof NicknameTakenError ? 'nickname_taken' : 'sync_unavailable' };
    }
    finally { setSubmitting(false); }
  }, [send, user]);
  // Compatibility for callers that only need a success flag.
  const submit = useCallback(async (patch?: ResumeAnswers) => (await submitResult(patch)).ok, [submitResult]);

  // Retry on launch, foreground and while online in the foreground. The shared
  // outbox deduplicates the many mounted useResume hooks and keeps account scope.
  useEffect(() => {
    if (!hydrated || !owner) return;
    let active = true;
    const retry = async () => {
      // Migrate the old pending flag only when its email matches this account.
      const [outbox, oldPending] = await Promise.all([loadJSON(RESUME_OUTBOX, null), loadJSON<boolean>(PENDING, false)]);
      if (!active) return;
      const a = answersRef.current;
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
      if (!outbox && oldPending && email && String(a.email ?? '').trim().toLowerCase() === email) {
        await send(a);
      } else {
        await flushResume(owner, (opts) => getTokenRef.current(opts));
      }
    };
    const safelyRetry = () => { void retry().catch(() => {}); };
    safelyRetry();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') safelyRetry(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') safelyRetry(); }, 60_000);
    return () => { active = false; listener.remove(); clearInterval(timer); };
  }, [hydrated, owner, send, user?.primaryEmailAddress?.emailAddress]);

  return { answers, mergedAnswers, setField, completeness, submit, submitResult, submitting, hydrated, dirty };
}
