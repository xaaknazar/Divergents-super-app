// Числа на экране ломались дважды из-за неразрывного пробела в разделителе
// тысяч: iOS мерил строку по одной ширине, а рисовал по другой, и «11 240»
// показывалось как «11…». Тест держит разделитель обычным пробелом.
import { fmtInt } from '../format';

describe('fmtInt', () => {
  it('разделяет тысячи ОБЫЧНЫМ пробелом', () => {
    const s = fmtInt(11_240);
    expect(s).toBe('11 240');
    expect(s).not.toMatch(/[  ]/);
  });

  it('в больших числах неразрывных пробелов тоже нет', () => {
    expect(fmtInt(1_234_567)).not.toMatch(/[  ]/);
    expect(fmtInt(1_234_567)).toBe('1 234 567');
  });

  it('маленькие числа без разделителя', () => {
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(999)).toBe('999');
  });

  it('дробное округляется, мусор превращается в ноль', () => {
    expect(fmtInt(10_499.6)).toBe('10 500');
    expect(fmtInt(NaN)).toBe('0');
    expect(fmtInt(Infinity)).toBe('0');
  });
});

import { fmtDate, fmtDateTime, fmtDecimal, safeSpaces } from '../format';

// Gotham Rounded рисует U+00A0 шириной ~325 px: ни один форматтер не должен его отдавать.
const NBSP = /[  ]/;

describe('safeSpaces', () => {
  it('заменяет U+00A0 и U+202F обычным пробелом', () => {
    expect(safeSpaces('4 000 ₸')).toBe('4 000 ₸');
  });
});

describe('fmtDecimal', () => {
  it('запятая и не больше заданного числа знаков', () => {
    expect(fmtDecimal(42.25)).toBe('42,3');
    expect(fmtDecimal(1.005, 2)).not.toMatch(NBSP);
  });
  it('тысячи — обычным пробелом, без группировки — слитно', () => {
    expect(fmtDecimal(12345.6)).toBe('12 345,6');
    expect(fmtDecimal(10000, 3, false)).toBe('10000');
  });
  it('мусор превращается в ноль', () => {
    expect(fmtDecimal(NaN)).toBe('0');
  });
});

describe('fmtDate / fmtDateTime', () => {
  const ms = Date.UTC(2026, 9, 20, 9, 30);
  it('в датах с годом нет неразрывных пробелов', () => {
    const s = fmtDate(ms, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    expect(s).toContain('2026');
    expect(s).not.toMatch(NBSP);
  });
  it('дата со временем тоже чистая', () => {
    const s = fmtDateTime(ms, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    expect(s).toContain('30');
    expect(s).not.toMatch(NBSP);
  });
  it('неверная дата → пустая строка', () => {
    expect(fmtDate('не дата')).toBe('');
    expect(fmtDateTime(NaN)).toBe('');
  });
});
