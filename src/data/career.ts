import { T } from '../theme/tokens';

export const CAREER_FILTERS = [
  { t: 'Под профиль', icon: 'sparkles' as const },
  { t: 'Алматы' },
  { t: 'Удалёнка' },
  { t: 'HR' },
  { t: 'Senior+' },
];

export const BEST_MATCH = {
  title: 'Директор по развитию персонала',
  company: 'Kaspi.kz',
  city: 'Алматы',
  initial: 'K',
  tags: ['Офис', 'от 1.5М ₸', 'Senior'],
  match: 92,
  reason: 'Совпадение по Strategic, Command, Achiever и метапрограмме «процедуры»',
};

export const JOBS: { t: string; c: string; m: number; l: string; color: string }[] = [
  { t: 'Head of People', c: 'Forte Bank · Гибрид · от 2М ₸', m: 87, l: 'F', color: T.green },
  { t: 'Руководитель L&D', c: 'Halyk Bank · Алматы · от 1.2М ₸', m: 84, l: 'H', color: T.indigo },
  { t: 'HRBP Senior', c: 'Choco Group · Удалёнка · от 900к ₸', m: 79, l: 'C', color: T.brown },
  { t: 'Менеджер по обучению', c: 'Beeline KZ · Алматы · от 700к ₸', m: 72, l: 'B', color: T.purple },
];
