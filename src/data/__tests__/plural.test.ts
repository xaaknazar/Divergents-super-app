import * as pl from '../plural';

describe('склонения', () => {
  it('дни', () => {
    expect(pl.days(1)).toBe('1 день');
    expect(pl.days(2)).toBe('2 дня');
    expect(pl.days(4)).toBe('4 дня');
    expect(pl.days(5)).toBe('5 дней');
    expect(pl.days(21)).toBe('21 день');
    expect(pl.days(22)).toBe('22 дня');
    expect(pl.days(30)).toBe('30 дней');
  });

  it('11–14 — исключение, а не «один»', () => {
    expect(pl.days(11)).toBe('11 дней');
    expect(pl.days(12)).toBe('12 дней');
    expect(pl.days(14)).toBe('14 дней');
    expect(pl.days(111)).toBe('111 дней');
    expect(pl.days(112)).toBe('112 дней');
  });

  it('ноль — множественное', () => {
    expect(pl.days(0)).toBe('0 дней');
    expect(pl.spots(0)).toBe('0 мест');
  });

  it('слово отдельно от числа', () => {
    expect(pl.daysWord(1)).toBe('день');
    expect(pl.daysWord(3)).toBe('дня');
    expect(pl.daysWord(8)).toBe('дней');
  });

  it('человек: 1 человек, 2 человека, 5 человек', () => {
    expect(pl.people(1)).toBe('1 человек');
    expect(pl.people(2)).toBe('2 человека');
    expect(pl.people(5)).toBe('5 человек');
    expect(pl.people(21)).toBe('21 человек');
  });

  it('заявки, места, уроки, курсы, шаги', () => {
    expect(pl.applications(1)).toBe('1 заявка');
    expect(pl.applications(3)).toBe('3 заявки');
    expect(pl.applications(9)).toBe('9 заявок');
    expect(pl.spots(1)).toBe('1 место');
    expect(pl.lessons(2)).toBe('2 урока');
    expect(pl.courses(5)).toBe('5 курсов');
    expect(pl.steps(1001)).toBe('1001 шаг');
  });
});
