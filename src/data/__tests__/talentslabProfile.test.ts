import {
  effectiveResumeCompleteness,
  normalizeProfile,
  normalizeTalentPhotoUrl,
  profileFromSavedResume,
} from '../talentslab';

it('normalizes a wrapped snake_case Laravel profile when found is omitted', () => {
  const profile = normalizeProfile({
    data: {
      profile: {
        candidate_id: 42,
        full_name: 'Иван Иванов',
        resume_step: '5',
        completion_percent: '100%',
        current_city: 'Алматы',
        mbti_type: 'ENFJ',
        resume_data: { phone: '+7 700 000 00 00' },
      },
    },
  });

  expect(profile.found).toBe(true);
  expect(profile.fullName).toBe('Иван Иванов');
  expect(profile.resumeStep).toBe(5);
  expect(profile.completeness).toBe(100);
  expect(profile.currentCity).toBe('Алматы');
  expect(profile.resume?.phone).toBe('+7 700 000 00 00');
});

it('honors an explicit not-found response', () => {
  expect(normalizeProfile({ data: { found: false, email: 'none@example.com' } }).found).toBe(false);
});

it('never lets an empty server profile erase complete local progress', () => {
  const empty = normalizeProfile({ found: false });
  expect(effectiveResumeCompleteness(empty, 100)).toBe(100);
});

it('normalizes relative Laravel photo paths and nested avatar objects', () => {
  expect(normalizeTalentPhotoUrl('/storage/photos/123.jpg')).toBe('https://talentslab.org/storage/photos/123.jpg');
  expect(normalizeProfile({
    found: true,
    avatar: { original_url: 'storage/avatars/me.jpg' },
  }).photoUrl).toBe('https://talentslab.org/storage/avatars/me.jpg');
});

it('builds an offline profile from the saved questionnaire', () => {
  const profile = profileFromSavedResume({
    first_name: 'Иван',
    last_name: 'Иванов',
    current_city: 'Алматы',
    mbti_type: 'ENFJ',
  }, 'ivan@example.com');

  expect(profile?.found).toBe(true);
  expect(profile?.fullName).toBe('Иванов Иван');
  expect(profile?.email).toBe('ivan@example.com');
  expect(profile?.currentCity).toBe('Алматы');
  expect(profile?.mbtiType).toBe('ENFJ');
});
