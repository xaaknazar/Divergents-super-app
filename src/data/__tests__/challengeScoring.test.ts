// Зеркало серверного `dayPositive` (lib/challenge-scoring.ts): страница = 1
// балл, 400 шагов = 1 балл, No Sugar = 0 баллов, и вся сумма за день умножается
// на коэффициент участника. Раньше приложение давало 0 баллов ниже нормы, и при
// 19 страницах экран показывал 0, пока сервер хранил 19.
import { ChallengeTask, taskPoints, challengePointsToday, averagePerPastDay } from '../community';

const reading = (pages: number): ChallengeTask => ({
  id: 'reading', kind: 'metric', title: 'Чтение', icon: 'book.fill',
  unit: 'стр.', min: 20, current: pages, basePts: 20, unitSize: 1, ptsPerUnit: 1,
});

const steps = (value: number): ChallengeTask => ({
  id: 'steps', kind: 'metric', title: 'Активность', icon: 'figure.walk',
  unit: 'шагов', min: 10000, current: value, basePts: 25, unitSize: 400, ptsPerUnit: 1,
});

const sugar = (done: boolean): ChallengeTask => ({
  id: 'sugar', kind: 'binary', title: 'Без сахара', icon: 'cube.fill', done, basePts: 0,
});

describe('дневные баллы совпадают с серверным dayPositive', () => {
  it('начисляет за каждую страницу, даже ниже нормы', () => {
    expect(taskPoints(reading(19))).toBe(19);
    expect(taskPoints(reading(0))).toBe(0);
    expect(taskPoints(reading(20))).toBe(20);
    expect(taskPoints(reading(34))).toBe(34);
  });

  it('начисляет 1 балл за каждые полные 400 шагов', () => {
    expect(taskPoints(steps(9600))).toBe(24);
    expect(taskPoints(steps(10000))).toBe(25);
  });

  it('округляет шаги до сотен перед начислением', () => {
    // Без округления один шаг решал целый балл: 8000 — двадцать баллов,
    // 7999 — девятнадцать. Человек этого не видит и считает, что балл отняли.
    expect(taskPoints(steps(7999))).toBe(taskPoints(steps(8000)));
    expect(taskPoints(steps(7999))).toBe(20);
    // Округление именно к БЛИЖАЙШЕЙ сотне, а не всегда вверх.
    expect(taskPoints(steps(7949))).toBe(19);
    expect(taskPoints(steps(7950))).toBe(20);
  });

  it('страницы не округляются — иначе 19 стало бы нормой', () => {
    expect(taskPoints(reading(19))).toBe(19);
    expect(taskPoints(reading(99))).toBe(99);
  });

  it('за день без сахара баллов не даёт', () => {
    expect(taskPoints(sugar(true))).toBe(0);
    expect(taskPoints(sugar(false))).toBe(0);
  });

  it('складывает категории за день', () => {
    expect(challengePointsToday([reading(19), sugar(true), steps(9600)])).toBe(43);
  });

  it('умножает весь день на коэффициент участника', () => {
    expect(challengePointsToday([reading(19), sugar(true), steps(9600)], 1.5)).toBe(64.5);
    expect(challengePointsToday([reading(20), sugar(true), steps(10000)], 1.5)).toBe(67.5);
  });

  it('без коэффициента считает как ×1', () => {
    expect(challengePointsToday([reading(20), steps(10000)])).toBe(45);
  });
});

// Средний темп — по закрытым дням. Формула повторяет серверную
// (lib/challenge-scoring.ts): приложение считает её само, потому что зависит от
// текущего дня, а он живёт на челлендже, а не на участнике.
describe('средний темп', () => {
  it('не учитывает текущий день', () => {
    // Идёт день 5, за четыре закрытых дня набрано 200 очков.
    expect(averagePerPastDay(200, 5)).toBe(50);
  });

  it('в первый день не существует', () => {
    expect(averagePerPastDay(0, 1)).toBeNull();
    // Даже если очки за сегодня уже есть — усреднять всё равно нечего.
    expect(averagePerPastDay(120, 1)).toBeNull();
  });

  it('у выбывшего замирает вместе с очками', () => {
    // Заморожен на дне 3, идёт день 10: делим на 3, а не на 9 — иначе темп
    // «падал» бы у человека, который уже вне челленджа.
    expect(averagePerPastDay(150, 10, 3)).toBe(50);
  });

  it('заморозка в текущий день не делит на ноль', () => {
    expect(averagePerPastDay(80, 1, 1)).toBeNull();
    expect(averagePerPastDay(80, 2, 2)).toBe(80);
  });

  it('округляется до одного знака', () => {
    expect(averagePerPastDay(100, 4)).toBe(33.3);
  });
});
