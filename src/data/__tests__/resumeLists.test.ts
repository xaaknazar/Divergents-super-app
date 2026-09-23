import { resumeListValues } from '../talentslab';

const typeOf = (k: string) => (k === 'language_skills' ? 'tags' : 'textarea');

describe('resumeListValues', () => {
  it('textarea — многострочный текст, tags — массив', () => {
    const v = resumeListValues({
      resume_lines: {
        universities: ['КазНУ, Экономика, Алматы, 2015', 'NU'],
        language_skills: ['Английский — B2', ' '],
        work_experience: [],
      },
    } as any, typeOf);
    expect(v.universities).toBe('КазНУ, Экономика, Алматы, 2015\nNU');
    expect(v.language_skills).toEqual(['Английский — B2']);
    expect(v.work_experience).toBeUndefined();
    expect(v.awards).toBeUndefined();
  });

  it('старый сервер без resume_lines — ничего не подставляем', () => {
    expect(resumeListValues({ universities: [{ name: 'NU' }] } as any, typeOf)).toEqual({});
    expect(resumeListValues(null, typeOf)).toEqual({});
  });
});
