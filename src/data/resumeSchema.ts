// Resume questionnaire — mirrors the Talentslab candidate form (4 steps).
// Required/optional flags and option strings match Talentslab's CandidateForm validation.
import { SFName } from '../components/SFIcon';

export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'tags';

export interface ResumeField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  optional?: boolean;
}

export interface ResumeStep {
  key: string;
  title: string;
  icon: SFName;
  fields: ResumeField[];
}

export const RESUME_STEPS: ResumeStep[] = [
  {
    key: 'personal', title: 'Личные данные', icon: 'person.fill',
    fields: [
      { key: 'full_name', label: 'ФИО', type: 'text', placeholder: 'Фамилия Имя Отчество' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'you@example.com' },
      { key: 'phone', label: 'Телефон', type: 'text', placeholder: '+7 700 000 00 00' },
      { key: 'gender', label: 'Пол', type: 'select', options: ['Мужской', 'Женский'] },
      { key: 'marital_status', label: 'Семейное положение', type: 'select', options: ['Холост/Не замужем', 'Женат/Замужем', 'Разведен(а)', 'Вдовец/Вдова'] },
      { key: 'birth_date', label: 'Дата рождения', type: 'text', placeholder: 'ДД.ММ.ГГГГ' },
      { key: 'birth_place', label: 'Место рождения', type: 'text' },
      { key: 'current_city', label: 'Текущий город', type: 'text' },
      { key: 'citizenship', label: 'Гражданство', type: 'text' },
      { key: 'ready_to_relocate', label: 'Готов(а) к переезду', type: 'bool', optional: true },
      { key: 'instagram', label: 'Instagram', type: 'text', optional: true, placeholder: '@username' },
    ],
  },
  {
    key: 'additional', title: 'Дополнительно', icon: 'heart.fill',
    fields: [
      { key: 'religion', label: 'Религия', type: 'text' },
      { key: 'is_practicing', label: 'Практикующий(ая)', type: 'bool' },
      { key: 'hobbies', label: 'Хобби', type: 'textarea' },
      { key: 'interests', label: 'Интересы', type: 'textarea' },
      { key: 'visited_countries', label: 'Посещённые страны', type: 'tags', placeholder: 'Добавить страну' },
      { key: 'favorite_sports', label: 'Любимые виды спорта', type: 'tags', placeholder: 'Добавить вид спорта' },
      { key: 'books_per_year', label: 'Книг в год', type: 'number' },
      { key: 'educational_hours_weekly', label: 'Часов на обучение в неделю', type: 'number' },
      { key: 'entertainment_hours_weekly', label: 'Часов на развлечения в неделю', type: 'number' },
      { key: 'social_media_hours_weekly', label: 'Часов в соцсетях в неделю', type: 'number' },
      { key: 'has_driving_license', label: 'Водительские права', type: 'bool' },
    ],
  },
  {
    key: 'education', title: 'Образование и опыт', icon: 'graduationcap.fill',
    fields: [
      { key: 'school', label: 'Школа (название, город, год)', type: 'text' },
      { key: 'universities', label: 'Вузы и специальности', type: 'textarea', optional: true },
      { key: 'language_skills', label: 'Языки', type: 'tags', placeholder: 'напр. Английский B2' },
      { key: 'computer_skills', label: 'Компьютерные навыки', type: 'textarea' },
      { key: 'work_experience', label: 'Опыт работы', type: 'textarea', optional: true },
      { key: 'total_experience_years', label: 'Общий стаж (лет)', type: 'number' },
      { key: 'job_satisfaction', label: 'Удовлетворённость работой (1–5)', type: 'number' },
      { key: 'desired_position', label: 'Желаемая должность', type: 'text' },
      { key: 'activity_sphere', label: 'Сфера деятельности', type: 'text', optional: true },
      { key: 'awards', label: 'Награды и достижения', type: 'textarea', optional: true },
      { key: 'expected_salary_from', label: 'Зарплата от (₸)', type: 'number' },
      { key: 'expected_salary_to', label: 'Зарплата до (₸)', type: 'number' },
      { key: 'employer_requirements', label: 'Требования к работодателю', type: 'textarea' },
    ],
  },
  {
    key: 'assessments', title: 'Оценки и тесты', icon: 'checkmark.seal.fill',
    fields: [
      { key: 'mbti_type', label: 'Тип MBTI', type: 'select',
        options: ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
    ],
  },
];

export const REQUIRED_KEYS = RESUME_STEPS.flatMap((s) => s.fields.filter((f) => !f.optional).map((f) => f.key));
