import { applicationProfile, mergeResumeFromServer, resumeChanges, resumeFormValues } from '../resumeSync';
import { normalizeProfile } from '../talentslab';

it('attaches a real locally saved questionnaire even when Talentslab has no record', () => {
  const profile = applicationProfile(null, { first_name: 'Анна', last_name: 'Тест', nickname: 'Anna', phone: '+70000000000' });
  expect(profile?.found).toBe(true);
  expect(profile?.fullName).toBe('Тест Анна');
  expect(profile?.resume).toMatchObject({ nickname: 'Anna', phone: '+70000000000' });
  expect(profile?.gallup).toEqual([]);
});

it('keeps reports while attaching the latest mobile edits', () => {
  const server = normalizeProfile({ found: true, fullName: 'Old', resume: { current_city: 'Old' }, gallup: [{ rank: 1, name: 'Focus', domain: 'executing' }] });
  const profile = applicationProfile(server, { current_city: 'Алматы' });
  expect(profile?.currentCity).toBe('Алматы');
  expect(profile?.gallup).toEqual(server.gallup);
});

it('reads changed values from the website, protecting only pending or actively edited fields', () => {
  expect(mergeResumeFromServer({ phone: 'old', current_city: 'local', hobbies: 'old' },
    { phone: 'web', current_city: 'web', hobbies: '' }, ['current_city']))
    .toEqual({ phone: 'web', current_city: 'local', hobbies: '' });
});

it('does not send unchanged fields back over newer website edits', () => {
  expect(resumeChanges({ nickname: 'Anna', phone: 'new' }, { nickname: 'Anna', phone: 'old' })).toEqual({ phone: 'new' });
});

it('preserves all name parts when only the surname changes', () => {
  expect(resumeChanges({ first_name: 'Анна', last_name: 'Новая' }, { first_name: 'Анна', last_name: 'Старая' }))
    .toEqual({ first_name: 'Анна', last_name: 'Новая', middle_name: '' });
});

it('maps structured website lists without losing their editor representation', () => {
  expect(resumeFormValues({ phone: 'new', universities: [{ name: 'University' }], resume_lines: { universities: ['University, 2020'] } }))
    .toMatchObject({ phone: 'new', universities: 'University, 2020' });
});
