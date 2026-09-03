import { formatPhone, phoneDigits, isValidPhone, isInternationalPhone } from '../phone';

describe('formatPhone', () => {
  it('строит маску по мере набора', () => {
    expect(formatPhone('7')).toBe('+7 (7');
    expect(formatPhone('777')).toBe('+7 (777');
    expect(formatPhone('7771')).toBe('+7 (777) 1');
    expect(formatPhone('7771234567')).toBe('+7 (777) 123-45-67');
  });

  it('принимает привычную запись через 8 и без кода страны', () => {
    expect(formatPhone('87771234567')).toBe('+7 (777) 123-45-67');
    expect(formatPhone('77771234567')).toBe('+7 (777) 123-45-67');
    expect(formatPhone('+7 777 123 45 67')).toBe('+7 (777) 123-45-67');
  });

  it('оставляет пустое поле пустым, чтобы номер можно было стереть', () => {
    expect(formatPhone('')).toBe('');
  });

  it('не даёт набрать лишние цифры', () => {
    expect(formatPhone('7771234567888')).toBe('+7 (777) 123-45-67');
  });

  it('стирание идёт назад, а не топчется на скобке', () => {
    // Пользователь удалил последний символ строки «+7 (777) 1».
    expect(formatPhone('+7 (777) ')).toBe('+7 (777');
    expect(formatPhone('+7 (77')).toBe('+7 (77');
    expect(formatPhone('+7 (')).toBe('');
  });

  it('позволяет набрать «+7» вручную и продолжить', () => {
    expect(formatPhone('+')).toBe('+');
    expect(formatPhone('+7')).toBe('+7');
    expect(formatPhone('+77')).toBe('+7 (7');
  });

  it('международный номер оставляет как есть, с группировкой по три', () => {
    expect(formatPhone('+1')).toBe('+1');
    expect(formatPhone('+14155552671')).toBe('+141 555 526 71');
    expect(formatPhone('+998 90 123 45 67')).toBe('+998 901 234 567');
    // Не больше 15 цифр (E.164).
    expect(formatPhone('+1234567890123456789')).toBe('+123 456 789 012 345');
  });
});

describe('isInternationalPhone', () => {
  it('распознаёт код страны, отличный от 7', () => {
    expect(isInternationalPhone('+1 415')).toBe(true);
    expect(isInternationalPhone('+')).toBe(true);
    expect(isInternationalPhone('+7 (777)')).toBe(false);
    expect(isInternationalPhone('8777')).toBe(false);
    expect(isInternationalPhone('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('требует полный номер', () => {
    expect(isValidPhone('+7 (777) 123-45-67')).toBe(true);
    expect(isValidPhone('+7 (777) 123-45')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('+')).toBe(false);
  });

  it('международный номер — от 8 до 15 цифр', () => {
    expect(isValidPhone('+14155552671')).toBe(true);
    expect(isValidPhone('+998 901 234 567')).toBe(true);
    expect(isValidPhone('+1 415')).toBe(false);
    expect(isValidPhone('+1234567890123456')).toBe(false);
  });
});

describe('phoneDigits', () => {
  it('возвращает только цифры с кодом страны', () => {
    expect(phoneDigits('+7 (777) 123-45-67')).toBe('77771234567');
    expect(phoneDigits('+1 415 555 2671')).toBe('14155552671');
  });
});
