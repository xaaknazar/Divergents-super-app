import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BookDetailScreen } from '../BookDetailScreen';
import { fetchBook, setBookShelf, rateBook, updateBookComment } from '../../../data/books';
import { demoDetailBook, demoBookComment } from '../../../storybook/detailFixtures';

jest.mock('../../../data/books', () => ({ fetchBook: jest.fn(), setBookShelf: jest.fn(), rateBook: jest.fn(),
  postBookComment: jest.fn(), updateBookComment: jest.fn(), deleteBookComment: jest.fn() }));
let mockSignedIn = true;
jest.mock('@clerk/clerk-expo', () => {
  const getToken = async () => 'demo-token';
  return { useAuth: () => ({ getToken, isSignedIn: mockSignedIn }) };
});
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/AwardBadge', () => ({ AwardBadge: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));
const screen = () => <BookDetailScreen route={{ key: 'detail', name: 'BookDetail', params: { bookId: demoDetailBook.id } }} navigation={{ goBack: jest.fn() } as any} />;
const response = { book: demoDetailBook, comments: [demoBookComment, { ...demoBookComment, id: 'other', author: 'Другой читатель', mine: false }], myRating: 2, myShelf: { status: 'reading' as const, progress: 25 } };
beforeEach(() => {
  jest.clearAllMocks(); mockSignedIn = true;
  jest.mocked(fetchBook).mockResolvedValue(response);
  jest.mocked(setBookShelf).mockResolvedValue({ shelf: { status: 'reading', progress: 75 } });
  jest.mocked(rateBook).mockResolvedValue({ ratingAvg: 4.3, ratingCount: 9 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('sends explicit reading progress and keeps shelf changes separate from progress', async () => {
  const view = await render(screen());
  await view.findByText(demoDetailBook.title);
  await fireEvent.press(view.getByRole('button', { name: '75%' }));
  expect(setBookShelf).toHaveBeenLastCalledWith(demoDetailBook.id, 'demo-token', 'reading', 75);
  await view.findByText('Прогресс · 75%');
  await fireEvent.press(view.getByRole('radio', { name: 'В планах' }));
  expect(setBookShelf).toHaveBeenLastCalledWith(demoDetailBook.id, 'demo-token', 'want', undefined);
});
it('blocks shelf controls while saving and does not remove on a selected-status press', async () => {
  let finish!: (value: any) => void;
  jest.mocked(setBookShelf).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = await render(screen()); await view.findByText(demoDetailBook.title);
  await fireEvent.press(view.getByRole('radio', { name: 'Читаю' }));
  expect(setBookShelf).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: '50%' }));
  expect(view.getByRole('radio', { name: 'Прочитано' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(view.getByRole('button', { name: '75%' }));
  expect(setBookShelf).toHaveBeenCalledTimes(1);
  await act(async () => finish({ shelf: { status: 'reading', progress: 50 } }));
});
it('retains failed-save data and explicit removal confirmation', async () => {
  jest.mocked(setBookShelf).mockResolvedValueOnce(null);
  const view = await render(screen()); await view.findByText(demoDetailBook.title);
  await fireEvent.press(view.getByRole('button', { name: '100%' }));
  expect(view.getByText('Прогресс · 25%')).toBeTruthy();
  expect(Alert.alert).toHaveBeenCalledWith('Не удалось обновить полку', expect.any(String));
  jest.mocked(setBookShelf).mockClear();
  await fireEvent.press(view.getByRole('button', { name: 'Убрать с полки' }));
  expect(Alert.alert).toHaveBeenLastCalledWith('Убрать с полки?', expect.any(String), expect.any(Array));
  expect(setBookShelf).not.toHaveBeenCalled();
});
it('keeps editorial and reader ratings separate and preserves rating submission', async () => {
  const view = await render(screen()); await view.findByText(demoDetailBook.title);
  expect(view.getByLabelText('Оценка Divergents 4.5')).toBeTruthy();
  expect(view.getByText('Читатели · 4.2 из 5 · оценок: 8')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: '4 из 5' }));
  expect(rateBook).toHaveBeenCalledWith(demoDetailBook.id, 'demo-token', 4);
});
it('allows only own review actions, prefills edits and preserves update endpoint', async () => {
  jest.mocked(updateBookComment).mockResolvedValue(true);
  const view = await render(screen()); await view.findByText(demoDetailBook.title);
  expect(view.getAllByRole('button', { name: 'Изменить' })).toHaveLength(1);
  await fireEvent.press(view.getByRole('button', { name: 'Изменить' }));
  expect(view.getByLabelText('Изменить текст').props.value).toBe(demoBookComment.content);
  await fireEvent.changeText(view.getByLabelText('Изменить текст'), 'Исправленная рецензия');
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить' }));
  expect(updateBookComment).toHaveBeenCalledWith(demoDetailBook.id, demoBookComment.id, 'demo-token', 'Исправленная рецензия');
  expect(view.getByLabelText('Написать рецензию').props.value).toBe('');
});
it('does not submit signed-out mutations', async () => {
  mockSignedIn = false;
  const view = await render(screen()); await view.findByText(demoDetailBook.title);
  await fireEvent.press(view.getByRole('button', { name: '50%' }));
  await fireEvent.press(view.getByRole('button', { name: '4 из 5' }));
  expect(setBookShelf).not.toHaveBeenCalled(); expect(rateBook).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Войдите', expect.any(String));
});
