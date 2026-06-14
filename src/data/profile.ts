import { T } from '../theme/tokens';
import { SFName } from '../components/SFIcon';

export const USER = {
  name: 'Beknazar K.',
  initial: 'B',
  role: 'HR-директор · KEX Group · Алматы',
  psychotype: 'Паранойял',
  level: 9,
  age: '24 года',
  city: 'Алматы',
  family: 'Не женат',
  email: 'bek@kex.kz',
  phone: '+7 777 ··· 12',
  mbti: 'ENTJ-A',
  stats: { courses: 7, challenges: 3, books: 24 },
};

export const TALENTS: { i: number; t: string; v: number }[] = [
  { i: 1, t: 'Strategic', v: 0.96 },
  { i: 2, t: 'Command', v: 0.91 },
  { i: 3, t: 'Achiever', v: 0.88 },
  { i: 4, t: 'Focus', v: 0.83 },
  { i: 5, t: 'Analytical', v: 0.78 },
];

export const REPORTS: { k: string; name: string; icon: SFName; color: string }[] = [
  { k: 'DPS', name: 'Психотипы', icon: 'puzzlepiece.fill', color: T.brand },
  { k: 'DPT', name: 'Личностные', icon: 'brain.head.profile', color: T.brandAccent },
  { k: 'FMD', name: 'Управление', icon: 'flag.fill', color: T.orange },
  { k: 'DFR', name: 'Семейный', icon: 'figure.2.and.child.holdinghands', color: T.purple },
];

export const APPLICATIONS: { t: string; c: string; initial: string; color: string; status: string; statusBg: string; statusColor: string }[] = [
  { t: 'Директор HR', c: 'Kaspi.kz', initial: 'K', color: T.brand, status: 'Интервью', statusBg: 'rgba(52,199,89,0.15)', statusColor: T.green },
  { t: 'Head of People', c: 'Forte Bank', initial: 'F', color: T.green, status: 'Рассм.', statusBg: 'rgba(255,204,0,0.18)', statusColor: '#A07A00' },
  { t: 'HRBP Senior', c: 'Choco Group', initial: 'C', color: T.brown, status: 'Отправлен', statusBg: T.brandTinted, statusColor: T.brand },
];
