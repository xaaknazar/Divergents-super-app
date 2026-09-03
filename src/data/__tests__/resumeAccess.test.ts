import { RESUME_STEPS } from '../resumeSchema';
import { AREA_STEPS, missingForArea, canUseArea, missingSummary } from '../resumeAccess';

/** Заполняет все обязательные поля перечисленных шагов правдоподобными значениями. */
function fill(stepKeys: string[]): Record<string, any> {
  const a: Record<string, any> = {};
  for (const step of RESUME_STEPS) {
    if (!stepKeys.includes(step.key)) continue;
    for (const f of step.fields) {
      if (f.optional) continue;
      if (f.key === 'phone') a[f.key] = '+7 (777) 123-45-67';
      else if (f.type === 'date') a[f.key] = '28.10.1995';
      else if (f.type === 'bool') a[f.key] = false;
      else if (f.type === 'number') a[f.key] = 3;
      else if (f.type === 'tags') a[f.key] = ['что-то'];
      else if (f.type === 'select') a[f.key] = f.options![0];
      else a[f.key] = 'значение';
    }
  }
  return a;
}

describe('уровни доступа', () => {
  it('сообществу не нужен раздел «Образование и опыт»', () => {
    expect(AREA_STEPS.community).not.toContain('education');
    expect(AREA_STEPS.career).toContain('education');
  });

  it('пустая анкета не пускает никуда', () => {
    expect(canUseArea('community', {})).toBe(false);
    expect(canUseArea('career', {})).toBe(false);
  });

  it('личные + дополнительно + тесты открывают сообщество, но не отклики', () => {
    const a = fill(AREA_STEPS.community);
    expect(canUseArea('community', a)).toBe(true);
    expect(canUseArea('career', a)).toBe(false);
    expect(missingForArea('career', a).map((m) => m.key)).toEqual(['education']);
  });

  it('полная анкета открывает всё', () => {
    const a = fill(AREA_STEPS.career);
    expect(canUseArea('community', a)).toBe(true);
    expect(canUseArea('career', a)).toBe(true);
  });

  it('«Нет» — это ответ, а не пустое поле', () => {
    const a = fill(AREA_STEPS.community);
    // is_practicing / has_driving_license заполнены значением false.
    expect(a.is_practicing).toBe(false);
    expect(canUseArea('community', a)).toBe(true);
  });

  it('недописанный телефон и дата не считаются заполненными', () => {
    const a = fill(AREA_STEPS.community);
    expect(canUseArea('community', { ...a, phone: '+7 (777' })).toBe(false);
    expect(canUseArea('community', { ...a, birth_date: '28.10.' })).toBe(false);
  });

  it('Gallup не требуется — он желателен', () => {
    const a = fill(AREA_STEPS.career);
    // В анкете Gallup — не поле, а загрузка файла; правила доступа его не знают.
    expect(canUseArea('career', a)).toBe(true);
  });

  it('сводка перечисляет разделы и поля', () => {
    const text = missingSummary(missingForArea('community', {}));
    expect(text).toContain('Личные данные');
    expect(text).toContain('Дополнительно');
    expect(text).toContain('Оценки и тесты');
  });
});
