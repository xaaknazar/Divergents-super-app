import { profileFromSavedResume, resumeListValues, type ResumeAnswers, type ResumeData, type TalentProfile } from './talentslab';
import { REQUIRED_KEYS, RESUME_STEPS } from './resumeSchema';

const fields = RESUME_STEPS.flatMap((step) => step.fields);

/** Saved app answers are real applicant data even before Talentslab has a row. */
export function applicationProfile(profile: TalentProfile | null, answers: ResumeAnswers): TalentProfile | undefined {
  const local = profileFromSavedResume({ ...profile?.resume, ...answers }, profile?.email);
  if (!local) return profile?.found ? profile : undefined;
  return {
    ...profile, ...local,
    fullName: local.fullName || profile?.fullName || null,
    phone: local.phone || profile?.phone || null,
    currentCity: local.currentCity || profile?.currentCity || null,
    completeness: Math.round(REQUIRED_KEYS.filter((key) => {
      const value = local.resume?.[key as keyof ResumeData];
      return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
    }).length / Math.max(1, REQUIRED_KEYS.length) * 100),
    photoUrl: local.photoUrl || profile?.photoUrl || null,
    gallup: profile?.gallup ?? [], gardner: profile?.gardner ?? [],
    reports: profile?.reports ?? [], reportsText: profile?.reportsText ?? null,
  };
}

/** Translate server-shaped values to the editor without flattening object lists. */
export function resumeFormValues(resume: ResumeData): ResumeAnswers {
  const lists = resumeListValues(resume, (key) => fields.find((f) => f.key === key)?.type);
  const out: ResumeAnswers = { ...lists };
  for (const field of fields) {
    if (field.key in lists) continue;
    const value = (resume as ResumeAnswers)[field.key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.every((v) => typeof v === 'string')) out[field.key] = value;
    } else if (value === null || typeof value !== 'object') out[field.key] = value;
  }
  return out;
}

/** Send only changed fields when a server baseline is known. */
export function resumeChanges(answers: ResumeAnswers, baseline: ResumeAnswers | null): ResumeAnswers {
  if (!baseline) return { ...answers };
  const patch = Object.fromEntries(Object.entries(answers).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(baseline[key])));
  // Transport composes full_name from the parts. A last-name-only change must
  // not replace the full name with just that last name.
  const parts = ['first_name', 'last_name', 'middle_name'];
  if (parts.some((key) => key in patch)) for (const key of parts) patch[key] = answers[key] ?? '';
  return patch;
}

export function mergeResumeFromServer(local: ResumeAnswers, remote: ResumeAnswers, protectedKeys: Iterable<string>): ResumeAnswers {
  const protectedSet = new Set(protectedKeys);
  return { ...local, ...Object.fromEntries(Object.entries(remote).filter(([key]) => !protectedSet.has(key))) };
}
