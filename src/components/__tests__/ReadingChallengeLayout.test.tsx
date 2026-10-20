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
    const action = state === 'review' ? view.getByText('Результат на проверке')
      : view.getByRole('button', { name: state === 'running' ? 'Пауза' : state === 'paused' ? 'Возобновить' : 'Старт' });
    const currentBook = view.getByLabelText(/^Что читаете:/);
    const progress = view.getByRole('header', { name: 'Сегодня' });
    const rank = view.getByRole('button', { name: /^Мой рейтинг\./ });
    const history = view.getByRole('button', { name: 'Мои книги и история' });

    expectOrder(view.container, timer, action, currentBook, progress, rank, history);
    expect(rank.parent).toBe(history.parent);
    const siblings = rank.parent!.children;
    expect(siblings.indexOf(history)).toBe(siblings.indexOf(rank) + 1);
    if (state === 'paused') expectOrder(view.container, action, view.getByLabelText('Страниц за этот подход'), currentBook);
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
