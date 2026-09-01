// Зеркало серверного `dayPositive` (lib/challenge-scoring.ts): страница = 1
// балл, 400 шагов = 1 балл, No Sugar = 0 баллов, и вся сумма за день умножается
// на коэффициент участника. Раньше приложение давало 0 баллов ниже нормы, и при
// 19 страницах экран показывал 0, пока сервер хранил 19.
import { ChallengeTask, taskPoints, challengePointsToday } from '../community';

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
    expect(taskPoints(steps(9599))).toBe(23);
    expect(taskPoints(steps(10000))).toBe(25);
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
