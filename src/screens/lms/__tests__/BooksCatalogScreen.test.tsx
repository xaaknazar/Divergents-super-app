import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BooksCatalogScreen } from '../BooksCatalogScreen';
import { fetchBooks } from '../../../data/books';
jest.mock('../../../data/books', () => ({ fetchBooks: jest.fn(), fetchMyShelf: jest.fn(async () => []) }));
jest.mock('@clerk/clerk-expo', () => {
  const getToken = async () => null;
  return { useAuth: () => ({ getToken, isSignedIn: false }) };
});
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../../theme/tokens') }));
jest.mock('../../../components/Screen', () => ({ Screen: (props: any) => {
  const View = require('react-native').View;
  return <View {...props} testID="catalog-scroll" />;
} }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const navigate = jest.fn();
const screen = () => <BooksCatalogScreen navigation={{ navigate, goBack: jest.fn() } as any} route={{ key: 'books', name: 'Books' }} />;
const books = [
  { id: 'one', title: 'Атомные привычки', author: 'Джеймс Клир', genres: ['Саморазвитие'], comments: 0 },
  { id: 'two', title: 'Мышление', author: 'Тестовый автор', genres: ['Психология'], comments: 0 },
];
beforeEach(() => { jest.clearAllMocks(); jest.mocked(fetchBooks).mockResolvedValue(books); });

it('recovers from an empty filtered search and can open a book', async () => {
  const view = await render(screen());
  await view.findByText('Атомные привычки');
  await fireEvent.press(view.getByRole('button', { name: 'Жанр: Все' }));
  await fireEvent.press(view.getByRole('button', { name: 'Психология' }));
  await fireEvent.changeText(view.getByLabelText('Поиск книги по названию или автору'), 'Нет такой книги');
  expect(view.getByText('Ничего не найдено')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Сбросить поиск и фильтр' }));
  expect(view.getByRole('button', { name: 'Жанр: Все' })).toBeTruthy();
  expect(view.getByLabelText('Поиск книги по названию или автору').props.value).toBe('');
  await fireEvent.press(view.getByRole('button', { name: 'Атомные привычки. Джеймс Клир' }));
  expect(navigate).toHaveBeenCalledWith('BookDetail', { bookId: 'one' });
});

it('shows retry instead of an empty-library claim after a request failure', async () => {
  jest.mocked(fetchBooks).mockRejectedValueOnce(new Error('offline'));
  const view = await render(screen());
  await view.findByText('Не удалось загрузить');
  expect(view.queryByText('Книги скоро появятся')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  await view.findByText('Атомные привычки');
});

it('describes a genuinely empty catalog without reporting a network failure', async () => {
  jest.mocked(fetchBooks).mockResolvedValue([]);
  const view = await render(screen());
  await view.findByText('Книги скоро появятся');
  expect(view.queryByText('Не удалось загрузить')).toBeNull();
});

it('keeps existing books and query when refreshing fails', async () => {
  const view = await render(screen());
  await view.findByText('Атомные привычки');
  await fireEvent.changeText(view.getByLabelText('Поиск книги по названию или автору'), 'Атомные');
  jest.mocked(fetchBooks).mockRejectedValueOnce(new Error('offline'));
  await fireEvent(view.getByTestId('catalog-scroll'), 'refresh');
  await view.findByText('Не удалось обновить библиотеку. Показаны ранее загруженные книги.');
  expect(view.getByRole('button', { name: 'Атомные привычки. Джеймс Клир' })).toBeTruthy();
  expect(view.getByLabelText('Поиск книги по названию или автору').props.value).toBe('Атомные');
});
