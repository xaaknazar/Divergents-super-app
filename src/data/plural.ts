// Русские склонения количественных подписей.
//
// Правило было скопировано в четыре файла (api.ts, community.ts, карточка курса,
// экран сообщества), а там, где копию не сделали, писали «21 дней» и
// «2 человек». Одно правило и один набор слов — чтобы подписи не расходились.

/** Слово в нужной форме: word(1,'день','дня','дней') → 'день'. */
export function word(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const m10 = abs % 10;
  const m100 = abs % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/** Число со словом: count(21,'день','дня','дней') → '21 день'. */
export function count(n: number, one: string, few: string, many: string): string {
  return `${n} ${word(n, one, few, many)}`;
}

// Готовые наборы — чтобы одно и то же понятие везде звучало одинаково.
export const daysWord = (n: number) => word(n, 'день', 'дня', 'дней');
export const days = (n: number) => count(n, 'день', 'дня', 'дней');
export const peopleWord = (n: number) => word(n, 'человек', 'человека', 'человек');
export const people = (n: number) => count(n, 'человек', 'человека', 'человек');
export const lessons = (n: number) => count(n, 'урок', 'урока', 'уроков');
export const courses = (n: number) => count(n, 'курс', 'курса', 'курсов');
export const spots = (n: number) => count(n, 'место', 'места', 'мест');
export const applications = (n: number) => count(n, 'заявка', 'заявки', 'заявок');
export const steps = (n: number) => count(n, 'шаг', 'шага', 'шагов');
export const teams = (n: number) => count(n, 'команда', 'команды', 'команд');
