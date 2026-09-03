import { coursesWord, formatGiftDate, normalizeGift, NO_GIFT } from '../api';

describe('склонение числа курсов', () => {
  it('склоняет по правилам русского языка', () => {
    expect(coursesWord(1)).toBe('1 курс');
    expect(coursesWord(2)).toBe('2 курса');
    expect(coursesWord(5)).toBe('5 курсов');
    expect(coursesWord(0)).toBe('0 курсов');
  });

  it('не путается на 11–14 и на составных числах', () => {
    expect(coursesWord(11)).toBe('11 курсов');
    expect(coursesWord(14)).toBe('14 курсов');
    expect(coursesWord(21)).toBe('21 курс');
    expect(coursesWord(22)).toBe('22 курса');
    expect(coursesWord(112)).toBe('112 курсов');
  });
});

describe('дата окончания акции', () => {
  it('переводит YYYY-MM-DD в русскую запись', () => {
    expect(formatGiftDate('2026-09-30')).toBe('30 сентября');
    expect(formatGiftDate('2026-01-01')).toBe('1 января');
    expect(formatGiftDate(' 2026-12-05 ')).toBe('5 декабря');
  });

  it('на пустой или битой дате возвращает пустую строку', () => {
    expect(formatGiftDate(null)).toBe('');
    expect(formatGiftDate(undefined)).toBe('');
    expect(formatGiftDate('30.09.2026')).toBe('');
    expect(formatGiftDate('2026-13-01')).toBe('');
  });
});

describe('ответ /me/role без акции', () => {
  it('старый сервер (поля нет) даёт безопасное значение по умолчанию', () => {
    expect(normalizeGift(undefined)).toEqual(NO_GIFT);
    expect(normalizeGift(null)).toEqual(NO_GIFT);
  });

  it('частичный ответ не ломает флаги', () => {
    expect(normalizeGift({ active: true, courseIds: ['a', 'b'] }))
      .toEqual({ active: true, until: null, eligible: false, courseIds: ['a', 'b'] });
    expect(normalizeGift({ active: true, until: '2026-09-30', eligible: true, courseIds: 'нет' }))
      .toEqual({ active: true, until: '2026-09-30', eligible: true, courseIds: [] });
  });
});
