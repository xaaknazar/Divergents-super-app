// Датчик шагов иногда отдаёт заведомую неправду — 221 шаг на 3,4 км. Проверка
// правдоподобия не даёт показать такое как измерение.
import { stepsPlausible, paceTimeSec } from '../ActivityContext';

describe('правдоподобие шагов', () => {
  it('221 шаг на 3,4 км — не измерение', () => {
    expect(stepsPlausible(221, 3400)).toBe(false);
  });
  it('нормальная пробежка и прогулка проходят', () => {
    expect(stepsPlausible(3600, 3400)).toBe(true);   // бег, ~1060 шагов/км
    expect(stepsPlausible(4700, 3400)).toBe(true);   // ходьба
  });
  it('на коротком отрезке не судим', () => {
    expect(stepsPlausible(3, 60)).toBe(true);
  });
});

describe('время для темпа', () => {
  it('в движении, если есть; иначе общее', () => {
    expect(paceTimeSec({ durationSec: 900, movingSec: 840 })).toBe(840);
    expect(paceTimeSec({ durationSec: 900 })).toBe(900);
    expect(paceTimeSec({ durationSec: 900, movingSec: 0 })).toBe(900);
  });
});
