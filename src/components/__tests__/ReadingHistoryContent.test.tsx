import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingHistoryContent } from '../ReadingHistoryContent';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ReadingHistory } from '../../data/readingBooks';
import { individualReadingFixture, readingBookExample } from '../../storybook/readingFixtures';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const current = { ...readingBookExample, finished: false, editable: true, lastReadAt: '2026-10-29T12:00:00Z' };
const finished = { ...current, key: 'finished', title: 'Netflix. Инсайдерская история компании, завоевавшей мир',
  pages: 195, elapsedMs: 344 * 60000, finished: true };
const data: ReadingHistory = { challengeId: individualReadingFixture.id, own: true, reader: individualReadingFixture.me!, books: [current, finished] };

test('current books, archive and diary are separate; returning a book preserves all recorded totals', async () => {
  const onStatus = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingHistoryContent data={data} busy={false} onStatus={onStatus} /></ThemePreviewProvider>);
  expect(v.getByText(current.title)).toBeTruthy();
  expect(v.queryByText(finished.title)).toBeNull();
  await fireEvent.press(v.getByRole('radio', { name: 'Прочитано' }));
  expect(v.getByText(finished.title)).toBeTruthy();
  expect(v.queryByText(current.title)).toBeNull();
  expect(v.getByText('195 стр. · 344 мин чтения')).toBeTruthy();
  await fireEvent.press(v.getByRole('button', { name: 'Вернуть в чтение' }));
  expect(onStatus).toHaveBeenCalledWith('finished', false);
  const returned = { ...data, books: [current, { ...finished, finished: false }] };
  await v.rerender(<ThemePreviewProvider><ReadingHistoryContent data={returned} busy={false} onStatus={onStatus} /></ThemePreviewProvider>);
  expect(v.queryByText(finished.title)).toBeNull();
  await fireEvent.press(v.getByRole('radio', { name: 'Читаю' }));
  expect(v.getByText('195 стр. · 344 мин чтения')).toBeTruthy();
  await fireEvent.press(v.getByRole('radio', { name: 'По дням' }));
  expect(v.getByText('страниц всего')).toBeTruthy();
  expect(v.queryByRole('button', { name: 'Отметить книгу прочитанной' })).toBeNull();
});

test('archived shelf-only books without an approach remain reachable and do not get a made-up date', async () => {
  const noApproaches: ReadingHistory = { ...data, books: [], supportsBookshelf: true,
    shelfBooks: [{ ...finished, addedAt: '2026-10-29T10:00:00Z', lastReadAt: null, pages: 0, elapsedMs: 0 }] };
  const v = await render(<ThemePreviewProvider><ReadingHistoryContent data={noApproaches} busy={false} onStatus={jest.fn()} /></ThemePreviewProvider>);
  expect(v.getByRole('radio', { name: 'Прочитано' }).props.accessibilityState.selected).toBe(true);
  expect(v.getByText(finished.title)).toBeTruthy();
  expect(v.getByText('Пока нет сохранённых подходов')).toBeTruthy();
  expect(v.queryByText(/Последнее чтение:/)).toBeNull();
  expect(v.getByRole('button', { name: 'Вернуть в чтение' })).toBeEnabled();
});

test('shelf status takes precedence without duplicating a book from history', async () => {
  const mixed: ReadingHistory = { ...data, books: [current], shelfBooks: [{ ...current, addedAt: null, finished: true }] };
  const v = await render(<ThemePreviewProvider><ReadingHistoryContent data={mixed} busy={false} onStatus={jest.fn()} /></ThemePreviewProvider>);
  expect(v.getAllByText(current.title)).toHaveLength(1);
  expect(v.getByRole('button', { name: 'Вернуть в чтение' })).toBeTruthy();
  await fireEvent.press(v.getByRole('radio', { name: 'Читаю' }));
  expect(v.queryByText(current.title)).toBeNull();
});

test('only the changed book shows progress and all status buttons are protected from double taps', async () => {
  const onStatus = jest.fn();
  const v = await render(<ThemePreviewProvider textSize="xl"><ReadingHistoryContent data={{ ...data, books: [finished] }}
    busy updatingBookKey="finished" onStatus={onStatus} /></ThemePreviewProvider>);
  const button = v.getByRole('button', { name: 'Вернуть в чтение' });
  expect(button.props.accessibilityState.busy).toBe(true);
  await fireEvent.press(button);
  expect(onStatus).not.toHaveBeenCalled();
  expect(v.getByText(finished.title).props.numberOfLines).toBeUndefined();
});

test('spectators can view the archive but cannot return or finish another reader’s books', async () => {
  const v = await render(<ThemePreviewProvider><ReadingHistoryContent data={{ ...data, own: false }} busy={false} onStatus={jest.fn()} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Отметить книгу прочитанной' })).toBeNull();
  await fireEvent.press(v.getByRole('radio', { name: 'Прочитано' }));
  expect(v.getByText(finished.title)).toBeTruthy();
  expect(v.queryByRole('button', { name: 'Вернуть в чтение' })).toBeNull();
});
