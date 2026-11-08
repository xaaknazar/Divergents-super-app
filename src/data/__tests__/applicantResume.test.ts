import { applicantResumeSections } from '../applicantResume';
import { resumeRows, ResumeData } from '../talentslab';

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
