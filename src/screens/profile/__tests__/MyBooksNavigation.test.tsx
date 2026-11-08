import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MyBooksScreen } from '../MyBooksScreen';

jest.mock('../../../state/useMyBooks', () => ({ useMyBooks: () => ({
  items: [{ id: 'shelf-1', libraryBookId: 'book-1', title: 'Тестовая книга', author: 'Автор', status: 'reading', detail: '25%' }],
  loaded: true, reload: jest.fn(), setRead: jest.fn(),
}) }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));

it('opens a book and the library in the profile stack and goes back without switching tabs', async () => {
  const parentNavigate = jest.fn();
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), getParent: jest.fn(() => ({ navigate: parentNavigate })) };
  const view = await render(<MyBooksScreen route={{ key: 'books', name: 'MyBooks' }} navigation={navigation as any} />);
  await fireEvent.press(view.getByRole('button', { name: 'Тестовая книга, Автор. 25%' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('BookDetail', { bookId: 'book-1' });
  await fireEvent.press(view.getByRole('button', { name: 'Библиотека книг' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Books');
  await fireEvent.press(view.getByRole('button', { name: 'Профиль' }));
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(parentNavigate).not.toHaveBeenCalled();
});
