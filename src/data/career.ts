import { T } from '../theme/tokens';

export interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  format: 'Офис' | 'Гибрид' | 'Удалёнка';
  salary: string;
  level: string;
  match: number;             // % fit to the user's profile
  logo: string;
  color: string;
  reason: string;            // short why-it-fits line
  talents: string[];         // matched Gallup talents
  goodBoss: string;          // the right manager for this role
  goodCompany: string;       // the right culture/company
  requirements: string[];
  about: string;
  postedLabel: string;
}

export const CAREER_FILTERS = ['Под профиль', 'Алматы', 'Удалёнка', 'HR', 'Senior+'];

export const JOBS: Job[] = [
  {
    id: 'kaspi-hrd', title: 'Директор по развитию персонала', company: 'Kaspi.kz', city: 'Алматы',
    format: 'Офис', salary: 'от 1.5М ₸', level: 'Senior', match: 92, logo: 'K', color: T.brand,
    reason: 'Совпадение по Strategic, Command, Achiever и метапрограмме «процедуры»',
    talents: ['Strategic', 'Command', 'Achiever', 'Focus'],
    goodBoss: 'Руководитель, который ставит амбициозные цели и даёт автономию в их достижении — не микроменеджит, ценит результат и скорость.',
    goodCompany: 'Сильная инженерная культура, быстрые решения, масштаб. Подходит вашему психотипу Паранойял и системному мышлению.',
    requirements: ['Опыт от 5 лет в HR/People', 'Построение команд 100+', 'Аналитика и метрики персонала', 'Английский B2+'],
    about: 'Возглавить направление развития персонала в крупнейшем финтех-холдинге: стратегия найма, обучение, культура и удержание талантов.',
    postedLabel: '2 дня назад',
  },
  {
    id: 'forte-hop', title: 'Head of People', company: 'Forte Bank', city: 'Алматы',
    format: 'Гибрид', salary: 'от 2М ₸', level: 'Senior', match: 87, logo: 'F', color: T.green,
    reason: 'Командное лидерство и стратегия — ваши Command + Strategic',
    talents: ['Command', 'Strategic', 'Analytical'],
    goodBoss: 'CEO/борд, который видит HR как стратегического партнёра и вовлекает в ключевые решения.',
    goodCompany: 'Банк в трансформации, где можно выстроить People-функцию с нуля. Структура и процессы — под ваш стиль.',
    requirements: ['Опыт Head of HR от 4 лет', 'Орг. дизайн и C&B', 'Управление изменениями'],
    about: 'Полный цикл People-функции: найм, развитие, культура, вознаграждение. Прямое подчинение правлению.',
    postedLabel: '4 дня назад',
  },
  {
    id: 'halyk-ld', title: 'Руководитель L&D', company: 'Halyk Bank', city: 'Алматы',
    format: 'Офис', salary: 'от 1.2М ₸', level: 'Middle+', match: 84, logo: 'H', color: T.indigo,
    reason: 'Обучение и развитие — ваш Developer-вектор и Focus',
    talents: ['Focus', 'Achiever', 'Developer'],
    goodBoss: 'HRD, который доверяет экспертизе и не мешает строить системное обучение.',
    goodCompany: 'Крупный банк с ресурсами на корпоративный университет и долгие программы.',
    requirements: ['Опыт в L&D от 3 лет', 'Построение корп. университета', 'LMS и метрики обучения'],
    about: 'Создание и развитие системы корпоративного обучения банка: программы, LMS, оценка эффективности.',
    postedLabel: '1 неделю назад',
  },
  {
    id: 'choco-hrbp', title: 'HRBP Senior', company: 'Choco Group', city: 'Алматы',
    format: 'Удалёнка', salary: 'от 900к ₸', level: 'Senior', match: 79, logo: 'C', color: T.brown,
    reason: 'Партнёрство с бизнесом и аналитика — Analytical + Relator',
    talents: ['Analytical', 'Strategic'],
    goodBoss: 'Продуктовый лидер, который мыслит данными и быстро принимает решения.',
    goodCompany: 'Технологичный продукт, гибкость, удалёнка. Темп высокий — учитывайте при выборе.',
    requirements: ['Опыт HRBP от 3 лет', 'Работа в IT/продукте', 'Английский B2+'],
    about: 'Стратегическое HR-партнёрство для продуктовых команд: найм, развитие, вовлечённость.',
    postedLabel: '3 дня назад',
  },
  {
    id: 'beeline-train', title: 'Менеджер по обучению', company: 'Beeline KZ', city: 'Алматы',
    format: 'Гибрид', salary: 'от 700к ₸', level: 'Middle', match: 72, logo: 'B', color: T.purple,
    reason: 'Развитие людей и процессы — Developer + Discipline',
    talents: ['Developer', 'Focus'],
    goodBoss: 'Руководитель обучения, который ценит структуру и измеримость.',
    goodCompany: 'Телеком с масштабом и стабильными процессами.',
    requirements: ['Опыт T&D от 2 лет', 'Проведение тренингов', 'Оценка результатов'],
    about: 'Организация и проведение обучающих программ для сотрудников телеком-оператора.',
    postedLabel: '5 дней назад',
  },
  {
    id: 'airastana-chro', title: 'CHRO', company: 'Air Astana', city: 'Алматы · Гибрид',
    format: 'Гибрид', salary: 'от 3М ₸', level: 'C-level', match: 81, logo: 'A', color: T.teal,
    reason: 'Системное лидерство уровня C — Strategic + Command + Achiever',
    talents: ['Strategic', 'Command', 'Achiever', 'Analytical'],
    goodBoss: 'CEO, который рассматривает HR как часть стратегии компании и даёт мандат на изменения.',
    goodCompany: 'Крупная авиакомпания с международными стандартами и сложной оргструктурой — масштаб для вашего потенциала.',
    requirements: ['Опыт C-level HR от 5 лет', 'Международные стандарты', 'Английский C1'],
    about: 'Стратегическое управление человеческим капиталом авиакомпании: культура, таланты, трансформация.',
    postedLabel: 'Сегодня',
  },
];

export const getJob = (id: string) => JOBS.find((j) => j.id === id);

// The Career module's unique value: match by psychotype/talents, not just skills.
export const GOOD_FIT = {
  bossTitle: 'Good Boss',
  bossText: 'Руководитель, который ставит цели и даёт автономию, ценит результат и глубину — а не контроль ради контроля.',
  companyTitle: 'Good Company',
  companyText: 'Компания с чёткими процессами и системным подходом, где ваши таланты Strategic и Command работают на полную.',
};
