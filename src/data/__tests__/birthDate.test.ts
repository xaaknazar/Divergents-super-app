import { isValidBirthDate, parseBirthDate, formatBirthDate } from '../birthDate';

describe('isValidBirthDate', () => {
  it('принимает корректную дату', () => {
    expect(isValidBirthDate('15.03.1990')).toBe(true);
    expect(isValidBirthDate('29.02.2000')).toBe(true); // високосный
  });

  it('отклоняет несуществующие даты', () => {
    expect(isValidBirthDate('31.02.1990')).toBe(false);
    expect(isValidBirthDate('29.02.1999')).toBe(false); // не високосный
    expect(isValidBirthDate('32.01.1990')).toBe(false);
    expect(isValidBirthDate('15.13.1990')).toBe(false);
  });

  it('отклоняет неверный формат', () => {
    expect(isValidBirthDate('1990-03-15')).toBe(false);
    expect(isValidBirthDate('5.3.1990')).toBe(false);
    expect(isValidBirthDate('абв')).toBe(false);
  });

  it('отклоняет неправдоподобные годы', () => {
    expect(isValidBirthDate('15.03.1800')).toBe(false);
    expect(isValidBirthDate(`15.03.${new Date().getFullYear() + 1}`)).toBe(false);
  });
});

describe('пикер даты рождения', () => {
  it('строка ↔ дата ходит туда-обратно без сдвига дня', () => {
    const d = parseBirthDate('28.10.1995');
    expect(d).not.toBeNull();
    expect(formatBirthDate(d as Date)).toBe('28.10.1995');
  });

  it('недописанное значение не превращается в дату', () => {
    expect(parseBirthDate('28.10.')).toBeNull();
    expect(parseBirthDate('')).toBeNull();
  });

  it('однозначные день и месяц дополняются нулём', () => {
    expect(formatBirthDate(new Date(2001, 0, 5, 12))).toBe('05.01.2001');
  });
});
