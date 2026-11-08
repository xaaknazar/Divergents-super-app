import type { Meta, StoryObj } from '@storybook/react-native';
import { ApplicantProfileReport } from './ApplicantProfileReport';
import { EMPTY_TALENT_PROFILE, TalentProfile } from '../data/talentslab';

// Fictional sample: never copy a real applicant's PDF into the repository.
const profile: TalentProfile = {
  ...EMPTY_TALENT_PROFILE, found: true, fullName: 'Алия Садыкова', currentCity: 'Астана',
  phone: '+7 700 000 00 00', email: 'candidate@example.com', mbtiType: 'ENTJ',
  resume: {
    birth_date: '12.04.1995', birth_place: 'Алматы', gender: 'Женский', citizenship: 'Казахстан', ready_to_relocate: false,
    family: { parents: [{ relation: 'Мать', birth_year: 1970, profession: 'Учитель' }], siblings: [{ relation: 'Брат', birth_year: 1998 }], children: [{ name: 'Ребёнок', birth_year: 2020 }], is_new_structure: true },
    desired_position: 'Руководитель образовательных проектов', activity_sphere: 'Образование и развитие команд',
    school: 'Школа с углублённым изучением иностранных языков',
    universities: ['Национальный университет — управление проектами, Алматы, 2017', 'Магистратура — организационная психология, 2019'],
    work_experience: ['Руководитель проектов · Образовательная компания · 2022–2026\nЗапуск программ обучения и развитие команды наставников.', 'Координатор · Центр развития · 2019–2022'],
    total_experience_years: 7, awards: ['Победитель конкурса образовательных проектов'],
    language_skills: [{ language: 'Казахский', level: 'Родной' }, { language: 'Английский', level: 'B2' }],
    computer_skills: 'Excel, PowerPoint, Figma', hobbies: 'Чтение, плавание, путешествия', books_per_year: 24,
  },
  reports: [{ type: 'gallup', title: 'CliftonStrengths · PDF-отчёт', url: 'https://example.com/cliftonstrengths.pdf' }],
  gallup: [{ rank: 1, name: 'Strategic', domain: 'strategic' }, { rank: 2, name: 'Achiever', domain: 'executing' }, { rank: 3, name: 'Communication', domain: 'influencing' }],
  gardner: [{ category: 'Лингвистический', score: 72 }, { category: 'Межличностный', score: 85 }, { category: 'Логико-математический', score: 63 }],
};
const meta = { title: 'Applicants/Talentslab report', component: ApplicantProfileReport,
  args: { profile, fallbackName: 'Участник' } } satisfies Meta<typeof ApplicantProfileReport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl', scheme: 'dark' } };
export const Minimal: Story = { args: { profile: { ...EMPTY_TALENT_PROFILE, fullName: 'Участник' } } };
export const Psychometrics: Story = { args: { profile: { ...profile, resume: null } } };
