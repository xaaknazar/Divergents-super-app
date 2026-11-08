import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AddReadBookSheet } from '../AddReadBookSheet';
jest.mock('../HalfSheet', () => ({ HalfSheet: ({ children, footer }: any) => <>{children}{footer}</> }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../theme/tokens'), reduceMotion: true }) }));

it('requires title and author, saves trimmed values, closes only after confirmation', async () => {
  let resolve!: () => void;
  const save = jest.fn(() => new Promise<void>(r => { resolve = r; }));
  const close = jest.fn();
  const view = await render(<AddReadBookSheet onSave={save} onClose={close} />);
  const button = view.getByRole('button', { name: 'Добавить в библиотеку' });
  await fireEvent.press(button); expect(save).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByLabelText('Название книги'), '  Книга  ');
  await fireEvent.press(button); expect(save).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByLabelText('Автор'), ' Автор ');
  await fireEvent.press(button); await fireEvent.press(button);
  expect(save).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledWith('Книга', 'Автор'); expect(close).not.toHaveBeenCalled();
  resolve(); await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
it('keeps entered data and allows retry when saving fails', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('Не удалось сохранить книгу.')).mockResolvedValue(undefined);
  const close = jest.fn(); const view = await render(<AddReadBookSheet onSave={save} onClose={close} />);
  await fireEvent.changeText(view.getByLabelText('Название книги'), 'Книга'); await fireEvent.changeText(view.getByLabelText('Автор'), 'Автор');
  await fireEvent.press(view.getByRole('button', { name: 'Добавить в библиотеку' }));
  await waitFor(() => expect(view.getByText('Не удалось сохранить книгу.')).toBeTruthy());
  expect(view.getByLabelText('Название книги').props.value).toBe('Книга'); expect(close).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Добавить в библиотеку' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
