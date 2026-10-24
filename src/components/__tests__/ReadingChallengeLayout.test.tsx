import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { ReadingChallengeContent, ReadingChallengeContentProps, ReadingBookInput } from '../ReadingChallengeContent';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));

const book = (): ReadingBookInput => ({
  title: 'Атомные привычки', author: 'Джеймс Клир', status: 'verified',
  verified: { title: 'Атомные привычки', author: 'Джеймс Клир' }, suggestions: [],
  pick: jest.fn(), reject: jest.fn(), manual: jest.fn(), setTitle: jest.fn(), setAuthor: jest.fn(), check: jest.fn(), edit: jest.fn(),
});
const session = {
  id: 'layout-session', deviceId: 'layout-device', day: 14, book: 'Атомные привычки', author: 'Джеймс Клир',
  budgetMs: 36_000_000, startedAt: '2026-10-20T08:00:00Z', elapsedMs: 18 * 60_000, status: 'running' as const,
};
const props = (): ReadingChallengeContentProps => ({
  data: { ...individualReadingFixture, session: null, me: {
    ...individualReadingFixture.me!, history: [{ day: 14, state: 'open', pages: 0, elapsedMs: 0 }],
  } },
  remainingMs: 3_600_000, timerState: 'ready', protection: 'ready', busy: false, awaitingPages: false, needsRecovery: false,
  book: book(), onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(), onSaveApproach: jest.fn(),
  onJoin: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onRanking: jest.fn(), onHistory: jest.fn(), onResume: jest.fn(),
});

// Walk rendered host nodes in reading order, not component names or a styling snapshot.
function renderedOrder(node: TestInstance): TestInstance[] {
  return [node, ...node.children.flatMap(child => typeof child === 'string' ? [] : renderedOrder(child))];
}
function expectOrder(root: TestInstance, ...nodes: TestInstance[]) {
  const order = renderedOrder(root);
  const positions = nodes.map(node => order.indexOf(node));
  expect(positions.every(position => position >= 0)).toBe(true);
  positions.slice(1).forEach((position, index) => expect(position).toBeGreaterThan(positions[index]));
}

type LayoutCase = 'ready' | 'running' | 'paused' | 'review';
test.each<LayoutCase>(['ready', 'running', 'paused', 'review'])(
  '%s: timer actions precede the book, and rank is immediately before history',
  async state => {
    const p = props();
    if (state === 'running' || state === 'paused') {
      p.timerState = state;
      p.data = { ...p.data, session };
      p.remainingMs = 42 * 60_000;
      p.resumableSession = state === 'paused';
      p.canResume = true;
    } else if (state === 'review') {
      p.timerState = 'paused';
      p.data = { ...p.data, me: { ...p.data.me!, history: [{ day: 14, state: 'review', pages: 10, elapsedMs: 20 * 60_000 }] } };
      p.remainingMs = 40 * 60_000;
    }
    const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    const timer = view.getByRole('timer');
    const action = view.getByRole('button', { name: state === 'running' ? 'Пауза' : state === 'paused' ? 'Возобновить' : state === 'review' ? 'Новый подход' : 'Старт' });
    const currentBook = view.getByLabelText(/^Что читаете:/);
    const progress = view.getByRole('header', { name: 'Сегодня' });
    const rank = view.getByRole('button', { name: /^Мой рейтинг\./ });
    const history = view.getByRole('button', { name: 'Мои книги и история' });

    expectOrder(view.container, timer, action, currentBook, progress, rank, history);
    expect(rank.parent).toBe(history.parent);
    const siblings = rank.parent!.children;
    expect(siblings.indexOf(history)).toBe(siblings.indexOf(rank) + 1);
    if (state === 'paused') expect(view.queryByLabelText('Страниц за этот подход')).toBeNull();
    if (state === 'running') {
      expect(action).toBeEnabled();
      await fireEvent.press(action);
      expect(p.onPause).toHaveBeenCalledTimes(1);
    }
  },
);

test('book selection below the timer uses neutral guidance and keeps start disabled', async () => {
  const p = props();
  p.book = { ...p.book, title: '', author: '', status: 'empty', verified: null };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  const start = view.getByRole('button', { name: 'Старт' });
  expect(start).toBeDisabled();
  expectOrder(view.container, view.getByRole('timer'), start, view.getByRole('header', { name: 'Что читаете' }));
  expect(view.getByText('Чтобы начать, выберите и подтвердите книгу.')).toBeTruthy();
  expect(view.queryByText(/книг[ауи] выше/)).toBeNull();
});

test.each(['upcoming', 'finished'] as const)('%s keeps rank directly above history without a timer', async phase => {
  const p = props();
  p.data = { ...p.data, phase };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  const rank = view.getByRole('button', { name: /^Мой рейтинг\./ });
  const history = view.getByRole('button', { name: 'Мои книги и история' });
  expect(view.queryByRole('timer')).toBeNull();
  expectOrder(view.container, rank, history);
  expect(rank.parent).toBe(history.parent);
  const siblings = rank.parent!.children;
  expect(siblings.indexOf(history)).toBe(siblings.indexOf(rank) + 1);
});

test.each(['ready', 'unavailable'] as const)('pending pages lead the screen even with %s protection and a stale prop', async protection => {
  const p = props();
  p.protection = protection;
  p.data = { ...p.data, session: { ...session, elapsedMs: 3600000, status: 'awaiting_pages' } };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expectOrder(view.container, view.getByRole('header', { name: 'Осталось записать страницы' }),
    view.getByLabelText('Страниц за этот подход'), view.getByRole('button', { name: 'Сохранить подход' }), view.getByRole('timer'));
  expect(view.queryByRole('button', { name: 'Старт' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Новый подход' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Возобновить' })).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Страниц за этот подход'), '22');
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(22, undefined);
  expect(p.onStart).not.toHaveBeenCalled();
});
test('overtime reminder pauses, never silently finishes or credits pages', async () => {
  const p = props(); p.timerState = 'running'; p.remainingMs = -1000; p.data = { ...p.data, session };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByText('Час прочитан. Запишите страницы')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Записать страницы' }));
  expect(p.onPause).toHaveBeenCalledTimes(1);
  expect(p.onReport).not.toHaveBeenCalled(); expect(p.onSaveApproach).not.toHaveBeenCalled();
});
test('previous-day pages remain actionable after a challenge finishes', async () => {
  const p = props();
  p.data = { ...p.data, phase: 'finished', currentDay: 15, session: { ...session, status: 'awaiting_pages' } };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByText('Осталось записать страницы')).toBeTruthy();
  expect(view.getByText(/Это подход за прошлый день/)).toBeTruthy();
  expect(view.getByLabelText('Страниц за этот подход')).toBeTruthy();
  expect(view.queryByRole('timer')).toBeNull();
});
test('a reserved start whose response was lost offers only «Продолжить запуск» or zero-credit cancel', async () => {
  const p = props(); p.timerState = 'paused'; p.startRecovery = true; p.onContinueStart = jest.fn();
  p.data = { ...p.data, session: { ...session, elapsedMs: null } };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByText(/ответ не дошёл/)).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Старт' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Закрыть прерванный подход' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить запуск' }));
  expect(p.onContinueStart).toHaveBeenCalledTimes(1);
  expect(p.onStart).not.toHaveBeenCalled();
  expect(view.getByRole('button', { name: 'Отменить подход' })).toBeTruthy();
});
test('a reserved start can repair blocking permission before continuing', async () => {
  const p = props(); p.timerState = 'paused'; p.startRecovery = true; p.onContinueStart = jest.fn(); p.protection = 'permission';
  p.data = { ...p.data, session: { ...session, elapsedMs: null } };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Разрешить блокировку' }));
  expect(p.onPrepare).toHaveBeenCalledTimes(1);
  expect(view.getByRole('button', { name: 'Продолжить запуск' })).toBeTruthy();
});
