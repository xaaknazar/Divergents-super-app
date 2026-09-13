// Проверка отсева GPS-мусора на сценариях, ради которых он и появился.
//
// Главный из них — «человек стоит на месте». Именно он раздувал дистанцию и
// давал расхождение с часами: прежний фильтр (шаг короче двух метров не
// считаем) пропускал дрожание координаты как настоящее движение.
import {
  applyFix, applyFixes, haversineM, EMPTY_TRACK,
  MAX_ACCURACY_M, type Fix, type Track,
} from '../gpsFilter';

const BASE = { lat: 43.238949, lng: 76.889709 };
// Метров в градусе широты по той же сфере, что и в haversineM. Своя константа
// (111 320) расходилась бы с проверяемым кодом на десятую долю процента — мало
// для карты, но достаточно, чтобы точка «ровно на пороге» падала не в ту
// сторону и тест врал про поведение фильтра.
const M_PER_DEG_LAT = (6371000 * Math.PI) / 180;

/** Точка в N метрах к северу от базовой. */
function north(m: number, opts: Partial<Fix> & { t: number }): Fix {
  return {
    latitude: BASE.lat + m / M_PER_DEG_LAT,
    longitude: BASE.lng,
    accuracy: 5,
    timestamp: opts.t,
    ...opts,
  };
}

function track(fixes: Fix[], type: 'walk' | 'run' = 'run'): Track {
  return applyFixes(EMPTY_TRACK, fixes, type);
}

describe('haversineM', () => {
  it('меряет метры между близкими точками', () => {
    const d = haversineM(
      { latitude: BASE.lat, longitude: BASE.lng },
      { latitude: BASE.lat + 100 / M_PER_DEG_LAT, longitude: BASE.lng },
    );
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });
});

describe('стоящий человек', () => {
  it('не набегает дистанцию при дрожании координаты', () => {
    // Радиус погрешности 20 м; замеры пляшут в пределах ±8 м, как в городе.
    const jitter = [0, 6, -5, 7, -8, 4, -6, 5];
    const t = track(jitter.map((m, i) => north(m, { t: 1000 + i * 2000, accuracy: 20 })));
    expect(t.distanceM).toBe(0);
  });

  it('прежний порог в два метра такое дрожание пропускал', () => {
    // Свидетельство того, что проблема была не выдуманной: те же замеры при
    // старом правиле дают больше сотни метров из ничего.
    const jitter = [0, 6, -5, 7, -8, 4, -6, 5];
    let old = 0;
    for (let i = 1; i < jitter.length; i++) {
      const d = Math.abs(jitter[i] - jitter[i - 1]);
      if (d >= 2) old += d;
    }
    expect(old).toBeGreaterThan(70);
  });

  it('при хорошем сигнале мелкое дрожание тоже не считается', () => {
    const jitter = [0, 2, -1, 2, -2];
    const t = track(jitter.map((m, i) => north(m, { t: 1000 + i * 2000, accuracy: 4 })));
    expect(t.distanceM).toBe(0);
  });
});

describe('настоящее движение', () => {
  it('идущий человек набирает дистанцию без потерь', () => {
    // Десять шагов по 6 м с хорошим сигналом: 54 м между первой и последней.
    const fixes = Array.from({ length: 10 }, (_, i) => north(i * 6, { t: 1000 + i * 5000, accuracy: 5 }));
    const t = track(fixes, 'walk');
    expect(t.distanceM).toBeGreaterThan(53);
    expect(t.distanceM).toBeLessThan(55);
  });

  it('порог не съедает медленную ходьбу: отвергнутая точка не двигает якорь', () => {
    // Шаги по 3 м при погрешности 12 м — каждый по отдельности ниже порога
    // (6 м). Якорь при отказе остаётся на месте, поэтому шаги копятся и путь не
    // теряется: недосчитать можно только «хвост» короче одного порога.
    const steps = 40;
    const fixes = Array.from({ length: steps + 1 }, (_, i) => north(i * 3, { t: 1000 + i * 4000, accuracy: 12 }));
    const walked = steps * 3;
    const t = track(fixes, 'walk');
    expect(t.distanceM).toBeGreaterThanOrEqual(walked - 6);
    expect(t.distanceM).toBeLessThanOrEqual(walked + 0.5);
  });
});

describe('выбросы', () => {
  it('телепорт через квартал отбрасывается', () => {
    const t = track([
      north(0, { t: 0 }),
      north(10, { t: 5000 }),
      north(400, { t: 6000 }),   // 390 м за секунду — не человек
      north(20, { t: 7000 }),
    ], 'run');
    expect(t.distanceM).toBeGreaterThan(19);
    expect(t.distanceM).toBeLessThan(21);
  });

  it('после отброшенного выброса следующая точка меряется от настоящего якоря', () => {
    const t = track([
      north(0, { t: 0 }),
      north(500, { t: 1000 }),  // выброс
      north(12, { t: 9000 }),   // реальное продолжение
    ], 'run');
    expect(t.coords).toHaveLength(2);
    expect(t.distanceM).toBeGreaterThan(11);
    expect(t.distanceM).toBeLessThan(13);
  });

  it('для ходьбы порог скорости строже, чем для бега', () => {
    // 60 м за 10 с = 6 м/с: для бега нормально, для ходьбы невозможно.
    const fixes = [north(0, { t: 0 }), north(60, { t: 10_000 })];
    expect(track(fixes, 'run').distanceM).toBeGreaterThan(59);
    expect(track(fixes, 'walk').distanceM).toBe(0);
  });

  it('замер с недопустимой погрешностью не принимается', () => {
    const t = track([
      north(0, { t: 0 }),
      north(50, { t: 5000, accuracy: MAX_ACCURACY_M + 10 }),
      north(60, { t: 10_000 }),
    ], 'run');
    expect(t.coords).toHaveLength(2);
    expect(t.distanceM).toBeGreaterThan(59);
  });

  it('первым якорем не становится заведомо неверный замер', () => {
    const r = applyFix(EMPTY_TRACK, north(0, { t: 0, accuracy: 200 }), 'run');
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('inaccurate');
    expect(r.track.coords).toHaveLength(0);
  });

  it('время, идущее назад, отбрасывается', () => {
    const t0 = track([north(0, { t: 10_000 })]);
    const r = applyFix(t0, north(20, { t: 5000 }), 'run');
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('backwards');
  });

  it('нечисловые координаты отбрасываются', () => {
    const r = applyFix(EMPTY_TRACK, { latitude: NaN, longitude: 1, timestamp: 1 }, 'run');
    expect(r.reason).toBe('invalid');
  });
});

describe('пачка замеров', () => {
  it('сортируется по времени: система отдаёт их не по порядку', () => {
    const inOrder = [north(0, { t: 0 }), north(10, { t: 5000 }), north(20, { t: 10_000 })];
    const shuffled = [inOrder[2], inOrder[0], inOrder[1]];
    expect(track(shuffled).distanceM).toBeCloseTo(track(inOrder).distanceM, 5);
  });
});

describe('набор высоты', () => {
  it('шум высоты в пару метров не превращается в подъём', () => {
    const alts = [800, 802, 799, 801, 798];
    const t = track(alts.map((altitude, i) => north(i * 10, { t: i * 5000, altitude })), 'run');
    expect(t.elevationGainM).toBe(0);
  });

  it('настоящий подъём считается', () => {
    const t = track([
      north(0, { t: 0, altitude: 800 }),
      north(10, { t: 5000, altitude: 810 }),
      north(20, { t: 10_000, altitude: 822 }),
    ], 'run');
    expect(t.elevationGainM).toBeCloseTo(22, 5);
  });

  it('высоте с плохой точностью не верим', () => {
    const t = track([
      north(0, { t: 0, altitude: 800, altitudeAccuracy: 3 }),
      north(10, { t: 5000, altitude: 900, altitudeAccuracy: 120 }),
    ], 'run');
    expect(t.elevationGainM).toBe(0);
  });
});

describe('время в движении', () => {
  it('ровный бег: движение равно общему времени', () => {
    // 10 м каждые 4 с — 2,5 м/с, весь промежуток — движение.
    const fixes = Array.from({ length: 11 }, (_, i) => north(i * 10, { t: i * 4000 }));
    const t = track(fixes, 'run');
    expect(t.movingMs).toBe(40_000);
  });

  it('остановка у светофора не идёт в движение', () => {
    const t = track([
      north(0, { t: 0 }),
      north(10, { t: 4000 }),
      north(20, { t: 8000 }),
      // Две минуты на месте: замеры дрожат, фильтр их отбрасывает…
      north(21, { t: 30_000 }),
      north(19, { t: 60_000 }),
      north(22, { t: 90_000 }),
      // …и первый настоящий шаг после остановки принят, но за 120 с прошли 6 м
      // — это не движение.
      north(26, { t: 128_000 }),
      north(36, { t: 132_000 }),
    ], 'run');
    // Движение: 0→10 (4 с), 10→20 (4 с), 26→36 (4 с). Остановка — нет.
    expect(t.movingMs).toBe(12_000);
    expect(t.distanceM).toBeGreaterThan(35);
  });

  it('медленная прогулка — всё ещё движение', () => {
    // 0,8 м/с: 6 м за 7,5 с — вдвое выше порога стояния.
    const fixes = Array.from({ length: 9 }, (_, i) => north(i * 6, { t: i * 7500 }));
    expect(track(fixes, 'walk').movingMs).toBe(60_000);
  });
});
