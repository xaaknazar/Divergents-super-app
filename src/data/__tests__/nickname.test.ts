import { isValidNickname, nicknameError, sanitizeNickname } from '../nickname';

describe('nickname rules', () => {
  it('accepts a valid handle', () => {
    expect(isValidNickname('Aknazar')).toBe(true);
    expect(isValidNickname('Divergent7')).toBe(true);
    expect(nicknameError('Aknazar')).toBeNull();
  });

  it('rejects lowercase first letter, symbols, cyrillic and wrong length', () => {
    expect(nicknameError('aknazar')).toBe('Первая буква должна быть заглавной');
    expect(nicknameError('Ak nazar')).toMatch(/латинские/i);
    expect(nicknameError('Акназар')).toMatch(/латинские/i);
    expect(nicknameError('Ab')).toMatch(/Минимум/);
    expect(nicknameError('Aknazarkuanyshuly')).toMatch(/Максимум/);
    expect(nicknameError('')).toBe('Укажите псевдоним');
    expect(nicknameError('7Aknazar')).toBe('Псевдоним должен начинаться с буквы');
  });

  it('sanitises typing: strips symbols, caps first letter, trims to 13', () => {
    expect(sanitizeNickname('ak-nazar!')).toBe('Aknazar');
    expect(sanitizeNickname('aknazarkuanyshuly')).toBe('Aknazarkuanys');
  });
});
