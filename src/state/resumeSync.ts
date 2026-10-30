// Durable, account-bound outbox. Only an explicit save enqueues a questionnaire;
// retries send that snapshot, never an unfinished draft typed afterwards.
import { getTalentslabToken, submitResume, type ResumeAnswers } from '../data/talentslab';
import { applicationProfile } from '../data/resumeSync';
import { syncResumeSnapshot } from '../data/api';
import { readJSON, saveJSON } from './persist';
import { emitProfileChanged } from './profileBus';
import { NicknameTakenError } from '../data/nickname';

export const RESUME_OUTBOX = 'dvg.resumeOutbox.v1';
type GetToken = (opts?: { template?: string }) => Promise<string | null>;
export type ResumePending = { owner: string; revision: number; answers: ResumeAnswers; snapshot: ResumeAnswers; blockedReason?: 'nickname_taken' };
let revision = 0;
let generation = 0;
let storage: Promise<unknown> = Promise.resolve();
const flights = new Map<string, Promise<boolean>>();
const attempted = new Map<string, number>();

function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = storage.then(work, work);
  storage = next.catch(() => {});
  return next;
}

export async function pendingResume(owner: string): Promise<ResumePending | null> {
  const stored = await readJSON<ResumePending | null>(RESUME_OUTBOX, null);
  if (!stored.ok) throw new Error('resume_outbox_read_failed');
  const pending = stored.value;
  return pending?.owner === owner ? pending : null;
}

export async function enqueueResume(owner: string, answers: ResumeAnswers, getToken: GetToken, snapshot = answers): Promise<boolean> {
  const session = generation;
  await serial(async () => {
    if (session !== generation) return;
    const old = await pendingResume(owner);
    revision = Math.max(revision, old?.revision ?? 0) + 1;
    await saveJSON(RESUME_OUTBOX, { owner, revision, answers: { ...old?.answers, ...answers }, snapshot });
    const saved = await pendingResume(owner);
    if (saved?.revision !== revision) throw new Error('resume_outbox_write_failed');
    await saveJSON('dvg.resumePending', true);
  });
  if (session !== generation) return false;
  const ok = await flushResume(owner, getToken, true);
  // A save may have joined the tiny gap between the old drain's last read and
  // its completion. Do not call that new snapshot synchronized prematurely.
  return ok && session === generation && await pendingResume(owner)
    ? flushResume(owner, getToken, true) : ok && session === generation;
}

export function flushResume(owner: string, getToken: GetToken, force = false): Promise<boolean> {
  const existing = flights.get(owner);
  if (existing) return existing;
  if (!force && Date.now() - (attempted.get(owner) ?? 0) < 30_000) return Promise.resolve(false);
  attempted.set(owner, Date.now());
  const session = generation;
  const run = async () => {
    // A newer explicit save may arrive while the previous request is in flight.
    // Drain it in order; an old acknowledgement must never clear the new save.
    while (session === generation) {
      const pending = await serial(() => pendingResume(owner));
      if (!pending) return true;
      if (pending.blockedReason === 'nickname_taken') throw new NicknameTakenError();
      const token = await getTalentslabToken(getToken);
      if (session !== generation || !token) return false;
      const siteToken = await getToken();
      if (session !== generation) return false;
      try {
        // Validate/reserve the LMS nickname before sending it to Talentslab.
        // A known LMS collision must not become a seemingly saved Talent profile.
        const mirrored = await syncResumeSnapshot(siteToken, applicationProfile(null, pending.snapshot));
        if (session !== generation || !mirrored) return false;
        const ok = await submitResume(token, pending.answers);
        if (session !== generation || !ok) return false;
      } catch (error) {
        if (session !== generation) return false;
        if (!(error instanceof NicknameTakenError)) throw error;
        const current = await serial(async () => {
          if (session !== generation) return false;
          const latest = await pendingResume(owner);
          if (latest?.revision !== pending.revision) return false;
          await saveJSON(RESUME_OUTBOX, { ...latest, blockedReason: 'nickname_taken' });
          return true;
        });
        if (!current) continue; // a newer explicit save can fix the conflict
        throw error;
      }
      await serial(async () => {
        if (session !== generation) return;
        const latest = await pendingResume(owner);
        if (latest?.revision !== pending.revision) return;
        await saveJSON(RESUME_OUTBOX, null);
        if (await pendingResume(owner)) throw new Error('resume_outbox_clear_failed');
        await saveJSON('dvg.resumePending', false);
        await saveJSON('dvg.talentProfileCache.v1', null);
      });
      if (session === generation) emitProfileChanged();
    }
    return false;
  };
  const promise = run().catch((error) => {
    if (error instanceof NicknameTakenError) throw error;
    return false;
  }).finally(() => {
    if (flights.get(owner) === promise) flights.delete(owner);
  });
  flights.set(owner, promise);
  return promise;
}

/** Called before local PII is erased, so late responses cannot restore it. */
export async function stopResumeSync(): Promise<void> {
  generation += 1;
  flights.clear();
  attempted.clear();
  await storage;
}
