/** Season rules, shared by the calculator and the conversion help. No health-data inference. */
export const ACTIVITY_RULES = [
  { id: 'run', label: 'Бег', unit: 'км', amount: 1, steps: 2000, rule: '1 км = 2000 шагов', icon: 'figure.run' },
  { id: 'swim', label: 'Плавание', unit: 'м', amount: 100, steps: 1000, rule: '100 м = 1000 шагов', icon: 'waveform.path.ecg' },
  { id: 'cycle', label: 'Велосипед', unit: 'км', amount: 3, steps: 2000, rule: '3 км = 2000 шагов', icon: 'bicycle' },
  { id: 'pushups', label: 'Отжимания', unit: 'повт.', amount: 1, steps: 20, rule: '1 повт = 20 шагов', icon: 'dumbbell' },
  { id: 'squats', label: 'Приседания', unit: 'повт.', amount: 1, steps: 15, rule: '1 повт = 15 шагов', icon: 'dumbbell' },
  { id: 'crunches', label: 'Пресс (скручивания)', unit: 'повт.', amount: 1, steps: 20, rule: '1 повт = 20 шагов', icon: 'dumbbell' },
  { id: 'pullups', label: 'Подтягивания', unit: 'повт.', amount: 1, steps: 40, rule: '1 повт = 40 шагов', icon: 'dumbbell' },
  { id: 'plank', label: 'Планка', unit: 'мин', amount: 2, steps: 400, rule: '2 мин = 400 шагов', icon: 'stopwatch' },
  { id: 'yoga', label: 'Йога / пилатес', unit: 'мин', amount: 30, steps: 2000, rule: '30 мин = 2000 шагов', icon: 'figure.mind.and.body', femaleOnly: true },
] as const;
export type ActivityId = typeof ACTIVITY_RULES[number]['id'];
export interface ActivityEntry { id: ActivityId; value: string }
export const femaleQuestionnaire = (gender: unknown) => typeof gender === 'string' && ['женский', 'female'].includes(gender.trim().toLowerCase());
export function activityRules(gender: unknown) {
  return ACTIVITY_RULES.filter(rule => !('femaleOnly' in rule) || femaleQuestionnaire(gender));
}
export function activityNumber(value: string, whole = false): number | null {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 1000000 && (!whole || Number.isInteger(n)) ? n : null;
}
export function activitySteps(entry: ActivityEntry, gender: unknown): number | null {
  const rule = activityRules(gender).find(r => r.id === entry.id);
  if (!rule) return null;
  const n = activityNumber(entry.value, rule.unit === 'повт.');
  return n === null ? null : Math.floor((Math.round(n * 100) * rule.steps) / (rule.amount * 100));
}
export function activityTotal(base: string, entries: ActivityEntry[], gender: unknown): number | null {
  let total = activityNumber(base, true);
  if (total === null) return null;
  for (const entry of entries) {
    const steps = activitySteps(entry, gender);
    if (steps === null) return null;
    total += steps;
  }
  return total <= 1000000 ? total : null;
}
