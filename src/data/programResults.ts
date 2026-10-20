import { FitnessProgram, programStats, ProgramStats, shiftKey } from './fitness';
import type { ShareCard } from '../navigation/types';
import { days } from './plural';

// Gotham Rounded has an oversized non-breaking-space glyph on iOS. Intl's
// grouping separator must be normalized before rendering this brand font.
export const programNumber = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/[\u00a0\u202f]/g, ' ');
export const programEndKey = (p: FitnessProgram) => shiftKey(p.startKey, p.days - 1);
export function programDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const programPeriod = (p: FitnessProgram) => `${programDate(p.startKey)} — ${programDate(programEndKey(p))}`;

/** История выводится из сохранённых программ, не дублирует и не теряет журнал. */
export function programHistory(programs: FitnessProgram[], now = new Date()) {
  return programs.map(p => ({ p, s: programStats(p, now) })).filter(r => r.s.finished)
    .sort((a, b) => programEndKey(b.p).localeCompare(programEndKey(a.p)) || b.p.createdISO.localeCompare(a.p.createdISO));
}

/** Личные итоги конкретной программы, а не выдуманная дата выдачи общих ачивок. */
export function programMilestones(p: FitnessProgram, s: ProgramStats) {
  const badges: { id: string; icon: string; title: string; detail: string }[] = [];
  if (s.done === p.days && p.days > 0) badges.push({ id: 'perfect', icon: 'checkmark.seal.fill', title: 'Без пропусков', detail: `Норма выполнена во все ${days(p.days)}.` });
  const streak = [30, 21, 14, 7, 3].find(n => s.bestStreak >= n);
  if (streak) badges.push({ id: 'streak', icon: 'flame.fill', title: `${days(streak)} подряд`, detail: `Лучшая серия — ${days(s.bestStreak)} с выполненной нормой.` });
  const over = s.grid.filter(g => g.value > p.target && p.target > 0).length;
  if (over) badges.push({ id: 'extra', icon: 'bolt.fill', title: 'Больше цели', detail: `Вы превысили дневную норму: ${days(over)}.` });
  if (!badges.length && s.activeDays > 0) badges.push({ id: 'effort', icon: 'dumbbell', title: 'Каждое усилие в счёт', detail: `${days(s.activeDays)} с активностью. Частичные результаты тоже включены в итог.` });
  return badges;
}

export function programShareCard(p: FitnessProgram, s: ProgramStats): ShareCard {
  return {
    title: `${p.title} · ${s.finished ? 'итоги' : 'прогресс'}`,
    stats: [
      { l: 'Всего за программу', v: `${programNumber(s.total)} ${p.unit}` },
      { l: 'Дней с выполненной нормой', v: `${s.done} из ${p.days}` },
      { l: 'Лучшая серия', v: days(s.bestStreak) },
    ],
    caption: `${programPeriod(p)}\n${s.done === p.days ? 'Без пропусков · ' : ''}Цель: ${programNumber(p.target)} ${p.unit} в день`,
  };
}
