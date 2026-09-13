// Слияние серверного дня с неотправленными отметками.
//
// Проверяем именно то, из-за чего сломалось: отметка «без сахара», сделанная на
// сайте, приходила с сервера верной, а приложение показывало её снятой.
import { applyPending, type SavedPending } from '../challengeMerge';
import type { Challenge } from '../../data/community';

const base = {
  id: 'ch1',
  currentDay: 8,
  tasks: [
    { id: 'r', kind: 'metric', title: 'Чтение', icon: 'book', unit: 'стр.', min: 20, current: 30, basePts: 1, unitSize: 20, ptsPerUnit: 1 },
    { id: 'ns', kind: 'binary', title: 'Без сахара', icon: 'drop', done: true, basePts: 0 },
  ],
} as unknown as Challenge;

const taskById = (c: Challenge, id: string) => c.tasks.find((t) => t.id === id) as any;

test('нет очереди — берём серверное как есть', () => {
  const out = applyPending(base, null);
  expect(taskById(out, 'ns').done).toBe(true);
  expect(taskById(out, 'r').current).toBe(30);
});

test('отметка с сайта не затирается: пустая очередь ничего не меняет', () => {
  const pending: SavedPending = { id: 'ch1', day: 8, updates: [] };
  expect(taskById(applyPending(base, pending), 'ns').done).toBe(true);
});

test('неотправленная отметка побеждает серверную', () => {
  const pending: SavedPending = { id: 'ch1', day: 8, updates: [{ taskId: 'r', value: 45 }] };
  const out = applyPending(base, pending);
  expect(taskById(out, 'r').current).toBe(45);
  // Задача, которой в очереди нет, остаётся серверной.
  expect(taskById(out, 'ns').done).toBe(true);
});

test('осознанное снятие галочки видно сразу, пока запрос не подтверждён', () => {
  const pending: SavedPending = { id: 'ch1', day: 8, updates: [{ taskId: 'ns', done: false }] };
  expect(taskById(applyPending(base, pending), 'ns').done).toBe(false);
});

test('исправление вниз не подменяется максимумом', () => {
  const pending: SavedPending = { id: 'ch1', day: 8, updates: [{ taskId: 'r', value: 3 }] };
  expect(taskById(applyPending(base, pending), 'r').current).toBe(3);
});

test('очередь за другой день или другой челлендж игнорируется', () => {
  const otherDay: SavedPending = { id: 'ch1', day: 7, updates: [{ taskId: 'ns', done: false }] };
  const otherChallenge: SavedPending = { id: 'ch2', day: 8, updates: [{ taskId: 'ns', done: false }] };
  expect(taskById(applyPending(base, otherDay), 'ns').done).toBe(true);
  expect(taskById(applyPending(base, otherChallenge), 'ns').done).toBe(true);
});
