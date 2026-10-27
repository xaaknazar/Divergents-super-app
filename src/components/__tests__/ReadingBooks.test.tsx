import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReadingBookshelf, ReadingShelfComposer } from '../ReadingBookshelf';
import { ReadingTodayBooks } from '../ReadingTodayBooks';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture, readingBookExample } from '../../storybook/readingFixtures';
import { ReadingDetailSchema } from '../../data/reading';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const second = { ...readingBookExample, key: 'ol:OL2W', title: 'Пять уровней лидерства', author: 'Джон Максвелл', pages: 20, elapsedMs: 35 * 60000, nextPage: 21 };
const library = () => ({ books: [readingBookExample, second], busy: false, select: jest.fn(), retry: jest.fn() });

test('today lists pages and minutes separately for both books and the sum once', async () => {
  const v = await render(<ThemePreviewProvider><ReadingTodayBooks books={[readingBookExample, second]} /></ThemePreviewProvider>);
  expect(v.getByText('15 стр. · 25 мин')).toBeTruthy();
  expect(v.getByText('20 стр. · 35 мин')).toBeTruthy();
  expect(v.getByText('Всего 35 стр. · сохранено на сервере')).toBeTruthy();
  await v.rerender(<ThemePreviewProvider><ReadingTodayBooks books={[]} /></ThemePreviewProvider>);
  expect(v.queryByText('15 стр. · 25 мин')).toBeNull();
  expect(v.getByText(/после сохранения первого подхода/)).toBeTruthy();
});
test('shelf selects an existing book without replacing or removing any book', async () => {
  const lib = library();
  const v = await render(<ThemePreviewProvider><ReadingBookshelf library={lib} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
  expect(lib.select).toHaveBeenCalledWith(second);
  expect(v.getByText(readingBookExample.title)).toBeTruthy();
  expect(v.getByText(second.title)).toBeTruthy();
});
test('shelf keeps title readable at large type and disables selection while saving', async () => {
  const lib = library();
  const v = await render(<ThemePreviewProvider textSize="xl"><ReadingBookshelf library={lib} disabled /></ThemePreviewProvider>);
  const row = v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ });
  expect(row).toBeDisabled();
  expect(v.getByText(second.title).props.numberOfLines).toBeUndefined();
});
function props(): ReadingChallengeContentProps {
  return { data: { ...individualReadingFixture, session: null, todayBooks: [readingBookExample] },
    remainingMs: 35 * 60000, timerState: 'ready', protection: 'ready', busy: false, awaitingPages: false, needsRecovery: false,
    book: { title: readingBookExample.title, author: readingBookExample.author, status: 'verified',
      verified: { title: readingBookExample.title, author: readingBookExample.author, key: readingBookExample.key },
      suggestions: [], pick: jest.fn(), reject: jest.fn(), manual: jest.fn(), setTitle: jest.fn(), setAuthor: jest.fn(), check: jest.fn(), edit: jest.fn() },
    library: library(), onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(), onSaveApproach: jest.fn(),
    onJoin: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onRanking: jest.fn(), onHistory: jest.fn() };
}
test('after saving A the reader can pick B and its key/fromPage are used for the new approach', async () => {
  const p = props();
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: /^Сменить книгу:/ })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
  expect(p.library!.select).toHaveBeenCalledWith(second);
  await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={{ ...p.book, title: second.title, author: second.author,
    verified: { title: second.title, author: second.author, key: second.key } }} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Новый подход' }));
  expect(p.onStart).toHaveBeenCalledWith(second.title, { author: second.author, bookKey: second.key, coverId: undefined, fromPage: 21 });
});
test('an unsaved approach keeps book selection locked even before reaching 60 minutes', async () => {
  const p = props();
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} timerState="paused" resumableSession canResume onResume={jest.fn()}
    data={{ ...p.data, session: { id: 's1', deviceId: 'phone', day: p.data.currentDay, book: readingBookExample.title,
      status: 'running', startedAt: '2026-10-21T06:00:00Z', elapsedMs: null, budgetMs: 36000000 } }} sessionElapsedMs={25 * 60000} /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: /^Сменить книгу:/ })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Записать страницы' }));
  expect(v.getByText('Подход 25 мин')).toBeTruthy();
  expect(v.queryByRole('header', { name: 'Книга для следующего подхода' })).toBeNull();
});
test('adding another book uses a separate draft and never edits the selected book', async () => {
  const p = props();
  const composer: ReadingShelfComposer = { supported: true, adding: false, reset: jest.fn(), save: jest.fn(async () => true), draft: { ...p.book, title: '', author: '', verified: null, status: 'empty' } };
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} composer={composer} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Добавить книгу' }));
  expect(composer.reset).toHaveBeenCalledTimes(1);
  expect(v.getByLabelText('Название книги').props.value).toBe('');
  expect(p.book.edit).not.toHaveBeenCalled();
  expect(p.book.setTitle).not.toHaveBeenCalled();
  expect(p.book.setAuthor).not.toHaveBeenCalled();
  expect(p.onReport).not.toHaveBeenCalled();
  expect(v.getAllByText('15 стр. · 25 мин')).toHaveLength(2);
});

function shelfComposer(save: () => Promise<boolean>): ReadingShelfComposer {
  return { supported: true, adding: false, reset: jest.fn(), save,
    draft: { title: '', author: '', verified: null, status: 'empty', suggestions: [], pick: jest.fn(), reject: jest.fn(),
      manual: jest.fn(), setTitle: jest.fn(), setAuthor: jest.fn(), check: jest.fn(), edit: jest.fn() } };
}
function verifiedDraft(composer: ReadingShelfComposer): ReadingShelfComposer {
  const book = { title: 'Глубокая работа', author: 'Кэл Ньюпорт', key: 'ol:THIRD' };
  return { ...composer, draft: { ...composer.draft, ...book, status: 'verified', verified: book } };
}
test('during an active approach a new shelf book can be added but the selected approach cannot be changed', async () => {
  const p = props();
  p.timerState = 'running';
  p.data = { ...p.data, session: { id: 'active', deviceId: 'phone', day: p.data.currentDay, book: readingBookExample.title,
    bookKey: readingBookExample.key, status: 'running', startedAt: '2026-10-22T06:00:00Z', elapsedMs: null, budgetMs: 36000000 } };
  const composer = shelfComposer(jest.fn(async () => true));
  const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} composer={composer} /></ThemePreviewProvider>);
  // While reading, only the approach's book is shown; the rest of the shelf folds under «Другие книги».
  expect(v.queryByRole('button', { name: /Читать «Пять уровней лидерства»/ })).toBeNull();
  expect(v.queryByRole('button', { name: 'Добавить книгу' })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Другие книги: 1' }));
  const other = v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ });
  expect(other).toBeDisabled();
  await fireEvent.press(other);
  expect(p.library!.select).not.toHaveBeenCalled();
  const add = v.getByRole('button', { name: 'Добавить книгу' });
  expect(add).toBeEnabled();
  await fireEvent.press(add);
  await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} composer={verifiedDraft(composer)} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Добавить на полку' }));
  await waitFor(() => expect(v.getByText(/Книга добавлена на полку/)).toBeTruthy());
  expect(composer.save).toHaveBeenCalledTimes(1);
  expect(composer.reset).toHaveBeenCalledTimes(2);
  expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState).toMatchObject({ selected: true, disabled: true });
  expect(p.library!.select).not.toHaveBeenCalled();
  expect(p.book.edit).not.toHaveBeenCalled();
  expect(p.book.setTitle).not.toHaveBeenCalled();
  expect(p.book.setAuthor).not.toHaveBeenCalled();
  expect(p.onPause).not.toHaveBeenCalled();
  expect(p.onStart).not.toHaveBeenCalled();
  expect(p.onReport).not.toHaveBeenCalled();
});

test.each(['unconfirmed', 'rejected'] as const)('an %s shelf add retains the draft and selected book; cancel only resets the draft', async failure => {
  const lib = library();
  const save = jest.fn(async () => { if (failure === 'rejected') throw new Error('Сервер недоступен'); return false; });
  const composer = shelfComposer(save);
  const v = await render(<ThemePreviewProvider><ReadingBookshelf library={lib} composer={composer} selectedKey={readingBookExample.key} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Добавить книгу' }));
  const filled = verifiedDraft(composer);
  await v.rerender(<ThemePreviewProvider><ReadingBookshelf library={lib} composer={filled} selectedKey={readingBookExample.key} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Добавить на полку' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  if (failure === 'rejected') await waitFor(() => expect(v.getByText('Сервер недоступен')).toBeTruthy());
  expect(v.getByText('Глубокая работа')).toBeTruthy();
  expect(v.getByRole('button', { name: 'Добавить на полку' })).toBeEnabled();
  expect(composer.reset).toHaveBeenCalledTimes(1);
  expect(lib.select).not.toHaveBeenCalled();
  expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(v.getByRole('button', { name: 'Отмена добавления' }));
  expect(composer.reset).toHaveBeenCalledTimes(2);
  expect(v.queryByText('Глубокая работа')).toBeNull();
  expect(v.getByRole('button', { name: 'Добавить книгу' })).toBeTruthy();
  expect(lib.select).not.toHaveBeenCalled();
  expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState.selected).toBe(true);
  expect(v.getByText(second.title)).toBeTruthy();
});
test('the detail parser preserves daily book data while accepting an old server without it', () => {
  expect(ReadingDetailSchema.parse(props().data).todayBooks).toEqual([readingBookExample]);
  expect(ReadingDetailSchema.parse(individualReadingFixture).todayBooks).toBeUndefined();
});

describe('clean layout', () => {
  const allowedApps = { count: 1, editable: true, busy: false, needsReselection: false, choose: jest.fn() };
  test('with a shelf the current book appears once, inside «Что читаете»', async () => {
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...props()} /></ThemePreviewProvider>);
    expect(v.getAllByRole('header', { name: 'Что читаете' })).toHaveLength(1);
    expect(v.queryByLabelText(/^Что читаете:/)).toBeNull();
    expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState.selected).toBe(true);
  });
  test('reader-app settings are offered before reading and hidden while an approach is open', async () => {
    const p = { ...props(), allowedApps };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    // Configured: one quiet row after «Мои книги и история», not a card between the book and «Сегодня».
    const row = v.getByRole('button', { name: 'Приложения для чтения. Разрешено: 1' });
    const history = v.getByRole('button', { name: 'Мои книги и история' });
    expect(row.parent).toBe(history.parent);
    expect(row.parent!.children.indexOf(row)).toBe(row.parent!.children.indexOf(history) + 1);
    await fireEvent.press(row);
    expect(allowedApps.choose).toHaveBeenCalledTimes(1);
    // Nothing chosen yet: the full card with an explicit button stays above «Сегодня».
    await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} allowedApps={{ ...allowedApps, count: 0 }} /></ThemePreviewProvider>);
    expect(v.getByRole('header', { name: 'Приложения для чтения' })).toBeTruthy();
    expect(v.getByRole('button', { name: 'Выбрать читалки' })).toBeTruthy();
    await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} timerState="running" data={{ ...p.data,
      session: { id: 's1', deviceId: 'phone', day: p.data.currentDay, book: readingBookExample.title, bookKey: readingBookExample.key,
        status: 'running', startedAt: '2026-10-22T06:00:00Z', elapsedMs: null, budgetMs: 36000000 } }} /></ThemePreviewProvider>);
    expect(v.queryByRole('header', { name: 'Приложения для чтения' })).toBeNull();
    expect(v.queryByRole('button', { name: /^Приложения для чтения/ })).toBeNull();
  });
  test('a confirmed save is one quiet line below the next-approach button', async () => {
    const p = props();
    p.data = { ...p.data, me: { ...p.data.me!, history: [{ day: p.data.currentDay, state: 'open', pages: 15, elapsedMs: 25 * 60000 }] } };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    const next = v.getByRole('button', { name: 'Новый подход' });
    const saved = v.getByLabelText('Подход сохранён. сегодня 25 мин · 15 стр.');
    const order: unknown[] = [];
    const walk = (node: any) => { order.push(node); node.children?.forEach((child: any) => typeof child === 'string' ? null : walk(child)); };
    walk(v.container);
    expect(order.indexOf(saved)).toBeGreaterThan(order.indexOf(next));
    expect(order.indexOf(next)).toBeGreaterThan(-1);
  });
  test('an empty day hides the «books today» placeholder from the summary', async () => {
    const p = props(); p.data = { ...p.data, todayBooks: [] };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    expect(v.queryByRole('header', { name: 'Книги за сегодня' })).toBeNull();
  });
});

test('a finished book leaves «Что читаете»: it is marked after a confirmation and can be returned', async () => {
  const { Alert } = require('react-native');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => (args[2] as any[] | undefined)?.find(b => b.text === 'Прочитана')?.onPress?.());
  const setFinished = jest.fn(async () => true);
  const lib = { ...library(), setFinished, books: [{ ...readingBookExample, editable: true }, { ...second, finished: true, editable: true }] };
  const v = await render(<ThemePreviewProvider><ReadingBookshelf library={lib} selectedKey={readingBookExample.key} /></ThemePreviewProvider>);
  // The finished book is not offered for the next approach.
  expect(v.queryByRole('button', { name: /Читать «Пять уровней лидерства»/ })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Дочитал(а) эту книгу' }));
  expect(alert.mock.calls[0][1]).toMatch(/Моих книгах/);
  expect(setFinished).toHaveBeenCalledWith(readingBookExample.key, true);
  await fireEvent.press(v.getByRole('button', { name: 'Прочитанные книги: 1' }));
  await fireEvent.press(v.getByRole('button', { name: 'Вернуть' }));
  expect(setFinished).toHaveBeenLastCalledWith(second.key, false);
  // An approach in progress keeps its book: no «finished» action while selection is locked.
  await v.rerender(<ThemePreviewProvider><ReadingBookshelf library={lib} selectedKey={readingBookExample.key} selectionLocked /></ThemePreviewProvider>);
  expect(v.queryByRole('button', { name: 'Дочитал(а) эту книгу' })).toBeNull();
  alert.mockRestore();
});

describe('book chosen after the timer stopped', () => {
  const awaiting = (supportsReportBook: boolean | undefined) => {
    const p = props();
    p.awaitingPages = true; p.timerState = 'paused'; p.remainingMs = 0;
    p.data = { ...p.data, supportsReportBook, session: { id: 'wrong-book', deviceId: 'phone', day: p.data.currentDay, book: readingBookExample.title,
      author: readingBookExample.author, bookKey: readingBookExample.key, fromPage: 40, status: 'awaiting_pages',
      startedAt: '2026-10-22T06:00:00Z', elapsedMs: 20 * 60000, budgetMs: 36000000 } };
    return p;
  };
  test('the reader picks another shelf book before writing pages; pages and bookmark go to it', async () => {
    const p = awaiting(true);
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    const question = v.getByRole('header', { name: 'Какую книгу вы читали?' });
    // The choice comes before the page count, and the regular shelf is not shown twice.
    const order = (n: any): any[] => [n, ...n.children.flatMap((c: any) => typeof c === 'string' ? [] : order(c))];
    const nodes = order(v.container);
    expect(nodes.indexOf(question)).toBeLessThan(nodes.indexOf(v.getByLabelText('Страниц за этот подход')));
    expect(v.queryByRole('header', { name: 'Что читаете' })).toBeNull();
    expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    expect(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }).props.accessibilityState.selected).toBe(true);
    expect(p.library!.select).toHaveBeenCalledWith(expect.objectContaining({ key: second.key }));
    expect(v.getByText(/начали со страницы 21/)).toBeTruthy();
    await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '6');
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(6, 27, { book: second.title, author: second.author, bookKey: second.key, coverId: undefined, fromPage: 21 });
  });
  test('keeping the start book sends no book fields', async () => {
    const p = awaiting(true);
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    await fireEvent.press(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }));
    await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '3');
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(3, 43);
  });
  test.each(['removed', 'finished', 'bookmark changed'] as const)('a shelf refresh (%s) cannot change the book or bookmark of an unfinished form', async change => {
    const p = awaiting(true);
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '6');
    const refreshed = change === 'removed' ? [readingBookExample]
      : [readingBookExample, { ...second, nextPage: 100, finished: change === 'finished' }];
    await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} library={{ ...p.library!, books: refreshed }} busy /></ThemePreviewProvider>);
    expect(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }).props.accessibilityState.selected).toBe(true);
    expect(v.getByText(/начали со страницы 21/)).toBeTruthy();
    expect(v.getByLabelText('Страниц за этот подход').props.value).toBe('6');
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(6, 27, { book: second.title, author: second.author, bookKey: second.key, coverId: undefined, fromPage: 21 });
  });
  test('pausing before the daily goal allows choosing a book and saving only that segment', async () => {
    const p = awaiting(true);
    p.awaitingPages = false; p.remainingMs = 45 * 60000; p.resumableSession = true;
    p.canResume = true; p.onResume = jest.fn(); p.sessionElapsedMs = 15 * 60000;
    p.data = { ...p.data, session: { ...p.data.session!, status: 'running', elapsedMs: null } };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    await fireEvent.press(v.getByRole('button', { name: 'Записать страницы' }));
    expect(v.getByText(/Подход 15 мин/)).toBeTruthy();
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '6');
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onSaveApproach).toHaveBeenCalledWith(6, 27, { book: second.title, author: second.author, bookKey: second.key, coverId: undefined, fromPage: 21 });
    expect(p.onReport).not.toHaveBeenCalled();
    expect(p.onStart).not.toHaveBeenCalled();
  });
  test('the selected report book and draft pages do not leak to a different session', async () => {
    const p = awaiting(true);
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'), '6');
    await v.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p}
      data={{ ...p.data, session: { ...p.data.session!, id: 'next-session' } }} /></ThemePreviewProvider>);
    expect(v.getByRole('button', { name: new RegExp(`Читать «${readingBookExample.title}»`) }).props.accessibilityState.selected).toBe(true);
    expect(v.getByLabelText('Страниц за этот подход').props.value).toBe('0');
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(0, 40);
  });
  test('a start book that is not on the shelf stays selectable as the default', async () => {
    const p = awaiting(true);
    p.data = { ...p.data, session: { ...p.data.session!, book: 'Новая книга', author: 'Автор', bookKey: 'manual:новая', fromPage: null } };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    expect(v.getByRole('button', { name: /Читать «Новая книга»/ }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(v.getByRole('button', { name: /Читать «Пять уровней лидерства»/ }));
    await fireEvent.press(v.getByRole('button', { name: /Читать «Новая книга»/ }));
    expect(p.library!.select).toHaveBeenCalledTimes(1);
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(0, undefined);
  });
  test('an older server keeps the start book: no choice is offered', async () => {
    const p = awaiting(undefined);
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    expect(v.queryByRole('header', { name: 'Какую книгу вы читали?' })).toBeNull();
    expect(v.getByText(/Сменить можно после сохранения страниц/)).toBeTruthy();
    await fireEvent.press(v.getByRole('button', { name: 'Сохранить подход' }));
    expect(p.onReport).toHaveBeenCalledWith(0, 40);
  });
  test('while reading, the shelf says the book can be changed when pages are written', async () => {
    const p = awaiting(true);
    p.awaitingPages = false; p.timerState = 'running'; p.remainingMs = 30 * 60000;
    p.data = { ...p.data, session: { ...p.data.session!, status: 'running', elapsedMs: null } };
    const v = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
    expect(v.getByText('Книга этого подхода. Если выбрали не ту, смените её при записи страниц.')).toBeTruthy();
  });
});
