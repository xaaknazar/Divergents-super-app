import { sumMemberPenalties, totalFlags } from '../community';

test('команда теряет только фактически списанные у участника 165 баллов', () => {
  const members = [
    { penalty: -165, flags: { R: 1, NS: 1, A: 1 } },
    { penalty: 0, flags: { R: 0, NS: 0, A: 0 } },
  ];
  expect(sumMemberPenalties(members)).toBe(-165);
});

test('нулевое списание при трёх флагах не превращается в минус 300', () => {
  const members = [{ penalty: 0, flags: { R: 1, NS: 1, A: 1 } }];
  expect(totalFlags(members[0].flags)).toBe(3);
  expect(sumMemberPenalties(members)).toBe(0);
});

test('штраф не восстанавливается по флагам при отсутствующем значении', () => {
  const members = [{ flags: { R: 3, NS: 3, A: 3 }, penalty: undefined }];
  expect(sumMemberPenalties(members)).toBe(0);
});

test('сумма фактических списаний сохраняет дробные баллы', () => {
  expect(sumMemberPenalties([{ penalty: -67.5 }, { penalty: -165 }, { penalty: -300 }])).toBe(-532.5);
  expect(sumMemberPenalties([])).toBe(0);
  expect(sumMemberPenalties([{ penalty: NaN }, { penalty: Infinity }, { penalty: 100 }])).toBe(0);
});
