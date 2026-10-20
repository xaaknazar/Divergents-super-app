import { gallupEnglishName } from '../talentslab';

describe('gallupEnglishName', () => {
  it('показывает оригинальные названия Gallup', () => {
    expect(gallupEnglishName('Достижение')).toBe('Achiever');
    expect(gallupEnglishName('Индивидуализация')).toBe('Individualization');
    expect(gallupEnglishName('Уверенность в себе')).toBe('Self-Assurance');
    expect(gallupEnglishName('strategic')).toBe('Strategic');
  });
  it('неизвестное название оставляет как есть', () => {
    expect(gallupEnglishName(' Новая тема ')).toBe('Новая тема');
  });
});
