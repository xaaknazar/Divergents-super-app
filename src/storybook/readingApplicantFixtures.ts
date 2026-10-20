import type { ReadingApplicant } from '../data/readingApplicants';
import { normalizeProfile } from '../data/talentslab';
import { continuousReadingFixture } from './readingFixtures';

// Synthetic preview data, never fetched from a real applicant.
export const readingApplicantFixture: ReadingApplicant = { id: 'demo-applicant', teamId: 'demo-team', name: 'BookReader', status: 'pending', profileStatus: 'live',
  profile: normalizeProfile({ found: true, fullName: 'Демо Участник', email: 'reader@example.test', currentCity: 'Алматы',
    completeness: 100, resume: { firstName: 'Демо', lastName: 'Участник', city: 'Алматы', about: 'Люблю нон-фикшн и читаю каждый день.' },
    gallup: [{ rank: 1, name: 'Обучаемость', domain: 'strategic' }], gardner: [{ category: 'Лингвистический', score: 84 }] }) };
export const readingApplicantsFixture = { ...continuousReadingFixture, applications: [{ id: 'demo-applicant', teamId: 'demo-team', name: 'BookReader' }] };
