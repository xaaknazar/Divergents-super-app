import { applicantResumeSections } from '../applicantResume';
import { resumeRows, ResumeData, fmtList } from '../talentslab';

it('keeps zero and false answers, separates long lists, and uses resume_lines when raw lists are empty', () => {
  const sections = applicantResumeSections({ ready_to_relocate: false, books_per_year: 0,
    universities: ['Первый университет', 'Второй университет'], work_experience: [],
    resume_lines: { work_experience: ['Руководитель · Компания\nРабота с командой'] } });
  const rows = sections.flatMap(s => s.rows);
  expect(rows).toEqual(expect.arrayContaining([
    { label: 'Готов(а) к переезду', value: 'Нет' }, { label: 'Книг в год', value: '0' },
    { label: 'Вузы', value: 'Первый университет\n\nВторой университет' },
    { label: 'Опыт работы', value: 'Руководитель · Компания\nРабота с командой' },
  ]));
  expect(sections.some(s => !s.rows.length)).toBe(false);
});
it('does not lose any existing questionnaire field other than identity rendered in the report header', () => {
  const r: ResumeData = {
    full_name: 'Имя', email: 'test@example.com', phone: '123', instagram: '@test', current_city: 'Город',
    birth_date: '2000-01-01', birth_place: 'Город', gender: 'Женский', marital_status: 'Замужем', citizenship: 'Казахстан', ready_to_relocate: false,
    family: ['Семья'], school: 'Школа', universities: ['Вуз'], language_skills: ['Язык'], computer_skills: 'Навыки', work_experience: ['Опыт'],
    total_experience_years: 0, job_satisfaction: 0, desired_positions: ['Должность'], activity_sphere: 'Сфера', awards: ['Награда'], expected_salary: '100', employer_requirements: 'Условия',
    religion: 'Религия', is_practicing: false, hobbies: 'Хобби', interests: 'Интересы', visited_countries: ['Страна'], favorite_sports: ['Спорт'],
    books_per_year: 0, educational_hours_weekly: 0, entertainment_hours_weekly: 0, social_media_hours_weekly: 0, has_driving_license: false,
  };
  const identity = new Set(['ФИО', 'Email', 'Телефон', 'Instagram', 'Город']);
  const expected = resumeRows(r).filter(row => !identity.has(row.label));
  expect(applicantResumeSections(r).flatMap(s => s.rows)).toEqual(expect.arrayContaining(expected));
  expect(applicantResumeSections(r).flatMap(s => s.rows)).toHaveLength(expected.length);
});
it('renders no fabricated sections for an empty questionnaire', () => {
  expect(applicantResumeSections(null)).toEqual([]);
  expect(applicantResumeSections({})).toEqual([]);
});
it('retains Talentslab education specialisation and dated work responsibilities', () => {
  const rows = applicantResumeSections({
    universities: [{ name: 'Вуз', speciality: 'Маркетинг', degree: 'Магистр', graduation_year: 2020 }],
    work_experience: [{ position: 'Менеджер', company: 'Компания', city: 'Астана', start_month: 2, start_year: 2021, is_current: true, main_tasks: ['Обучение команды', 'Запуск программ'] }],
  }).flatMap(s => s.rows);
  expect(rows.find(r => r.label === 'Вузы')?.value).toBe('Вуз, Маркетинг, Магистр, 2020');
  expect(rows.find(r => r.label === 'Опыт работы')?.value).toBe('Менеджер · Компания\nАстана\n2.2021 — по настоящее время\nОбучение команды\nЗапуск программ');
});


it('formats the structured family returned by Talentslab without displaying transport metadata', () => {
  const family = { parents: [{ relation: 'Мать', birth_year: 1970, profession: 'Учитель' }],
    siblings: [{ relation: 'Брат', birth_year: '1998' }], children: [{ name: 'Ребёнок', birth_year: 2020 }], is_new_structure: true };
  const original = JSON.stringify(family);
  const expected = 'Родители:\nМать · 1970 г. р. · Учитель\n\nБратья и сёстры:\nБрат · 1998 г. р.\n\nДети:\nРебёнок · 2020 г. р.';
  expect(resumeRows({ family }).find(r => r.label === 'Семья')?.value).toBe(expected);
  expect(applicantResumeSections({ family }).flatMap(s => s.rows).find(r => r.label === 'Семья')?.value).toBe(expected);
  expect(JSON.stringify(family)).toBe(original);
});
it('preserves legacy family entries and does not infer missing family answers', () => {
  expect(resumeRows({ family: ['Мать', { type: 'Брат', birth_year: 2000 }] })).toEqual([{ label: 'Семья', value: 'Мать\nБрат · 2000 г. р.' }]);
  expect(resumeRows({ family: { parents: [], siblings: [{}], children: [], is_new_structure: true } })).toEqual([]);
  expect(resumeRows({ family: { no_parents: true, only_child: true } })[0].value).toBe('Родители:\nНет родителей\n\nБратья и сёстры:\nЕдинственный ребёнок');
});
it('does not leak object coercions or null into nested resume lists and preserves zero', () => {
  expect(fmtList([{ detail: { text: 'Награда' }, year: 0 }, null])).toBe('Награда · 0');
  expect(fmtList([{ name: { text: 'Вуз' }, city: 'Астана' }])).toBe('Вуз, Астана');
  expect(resumeRows({ computer_skills: { text: 'Excel' } } as unknown as ResumeData)).toEqual([{ label: 'Компьютерные навыки', value: 'Excel' }]);
});
