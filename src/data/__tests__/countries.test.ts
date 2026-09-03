import { COUNTRIES, POPULAR_COUNTRY_CODES, searchCountries, countryFlag } from '../countries';

describe('справочник стран', () => {
  it('список непустой и без дублей по коду', () => {
    expect(COUNTRIES.length).toBeGreaterThan(150);
    const codes = new Set(COUNTRIES.map((c) => c.code));
    expect(codes.size).toBe(COUNTRIES.length);
  });

  it('у каждой страны есть название и флаг', () => {
    for (const c of COUNTRIES) {
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
    }
  });

  it('без запроса первыми идут популярные', () => {
    const all = searchCountries('');
    expect(all).toHaveLength(COUNTRIES.length);
    expect(all[0].code).toBe(POPULAR_COUNTRY_CODES[0]);
    expect(all.slice(0, POPULAR_COUNTRY_CODES.length).map((c) => c.code)).toEqual(POPULAR_COUNTRY_CODES);
  });

  it('ищет по началу названия и по вхождению, регистр не важен', () => {
    const byStart = searchCountries('каз');
    expect(byStart[0].name).toBe('Казахстан');
    expect(searchCountries('КАЗ')[0].name).toBe('Казахстан');
    // Разговорные названия: человек ищет «Эмираты», а в справочнике «ОАЭ».
    expect(searchCountries('эмираты')[0].code).toBe('AE');
    expect(searchCountries('англия')[0].code).toBe('GB');
    expect(searchCountries('америка')[0].code).toBe('US');
    // И латиницей — раскладку часто не переключают.
    expect(searchCountries('france')[0].code).toBe('FR');
    // Совпадение с начала важнее середины: «мали», а не «Сомали».
    expect(searchCountries('мали')[0].name).toBe('Мали');
  });

  it('на бессмысленный запрос отдаёт пустой список, а не весь справочник', () => {
    expect(searchCountries('щщщ')).toHaveLength(0);
  });

  it('флаг находится по сохранённому названию', () => {
    expect(countryFlag('Казахстан')).toBe('🇰🇿');
    expect(countryFlag('  казахстан  ')).toBe('🇰🇿');
    // Значение, введённое раньше руками, просто останется без флага.
    expect(countryFlag('Эмираты')).toBe('');
  });
});
