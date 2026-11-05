import { memberTodayRows, teamTodayRows } from '../challengeRankingRows';
import type { OverallStanding, TeamStanding } from '../../data/community';

jest.mock('../SFIcon', () => ({ SF: () => null }));

const team = (id: string, rank: number, points: number): TeamStanding => ({ id, name: id, rank, points, members: 3, isMine: id === 'b', flags: 0 });
const person = (id: string, teamId: string, day: number, name = id): OverallStanding =>
  ({ id, name, teamId, teamName: teamId, points: 100, day, flags: { R: 0, NS: 0, A: 0 }, eliminated: false, isMe: false, rank: 1 });

it('ranks teams by today: the sum of their members’ points for the day', () => {
  const rows = teamTodayRows([team('a', 1, 2000), team('b', 2, 1900)], [person('x', 'a', 10), person('y', 'b', 30), person('z', 'b', 5)]);
  expect(rows.map((r) => [r.id, r.rank, r.value])).toEqual([['b', 1, '+35'], ['a', 2, '+10']]);
});

it('ranks people today by points, then goals done, then name — like the team card and the site', () => {
  const goal = (completed: boolean) => ({ id: 'r', kind: 'binary' as const, title: 'x', icon: 'book.fill' as const, unit: '', target: null, value: 0, done: completed, marked: true, completed });
  const rows = memberTodayRows([person('p1', 't', 20, 'Яна'), person('p2', 't', 20, 'Борис'), person('p3', 't', 20, 'Анна'), person('p4', 't', 40)],
    new Map([['p1', [goal(true)]], ['p2', [goal(true)]], ['p3', [goal(false)]]]));
  expect(rows.map((r) => r.id)).toEqual(['p4', 'p2', 'p1', 'p3']);
  expect(rows[0].subtitle).toBe('t');
  expect(rows[1].detail).toBeTruthy();
});
