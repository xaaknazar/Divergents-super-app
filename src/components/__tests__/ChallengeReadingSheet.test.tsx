import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ChallengeReadingSheet } from '../ChallengeReadingSheet';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../HeaderIcon', () => ({ HeaderIcon: ({ onPress, label }: any) => {
  const { Pressable, Text } = require('react-native'); return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>;
} }));
const books = [{ id: 'a', title: 'Атомные привычки', author: 'Джеймс Клир', todayPages: 20, pages: 84, finished: false }];
const save = jest.fn(async () => true), add = jest.fn(async () => null);
const mount = (props = {}) => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } }}><ThemePreviewProvider>
  <ChallengeReadingSheet books={books} unassignedPages={0} onRetry={() => {}} onClose={() => {}} onSave={save} onAdd={add} {...props} />
</ThemePreviewProvider></SafeAreaProvider>);
beforeEach(() => { jest.clearAllMocks(); save.mockResolvedValue(true); });
test('empty shelf requires book before pages can be saved', async () => {
  const ui = await mount({ books: [] });
  expect(ui.queryByText('Сохранить')).toBeNull();
  await fireEvent.press(ui.getByLabelText('Выбрать книгу'));
  expect(ui.getByLabelText('Добавить книгу').props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(ui.getByLabelText('Название книги'), 'Название');
  expect(ui.getByLabelText('Добавить книгу').props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(ui.getByLabelText('Автор книги'), 'Автор');
  expect(ui.getByLabelText('Добавить книгу').props.accessibilityState.disabled).toBe(false);
});
test('finishing book saves pages then offers next book', async () => {
  const ui = await mount();
  await fireEvent.press(ui.getByRole('checkbox'));
  await fireEvent.press(ui.getByLabelText('Сохранить'));
  await waitFor(() => expect(ui.getByText('Книга прочитана')).toBeTruthy());
  expect(save).toHaveBeenCalledWith({ bookId: 'a', pages: 20, finished: true });
  await fireEvent.press(ui.getByLabelText('Выбрать следующую книгу'));
  expect(ui.getByText('Мои книги')).toBeTruthy();
});
test('failed save preserves pages and does not claim success', async () => {
  save.mockResolvedValue(false); const ui = await mount();
  await fireEvent.changeText(ui.getByLabelText('Страниц сегодня в этой книге'), '35');
  await fireEvent.press(ui.getByLabelText('Сохранить'));
  expect(ui.queryByText('Сохранено')).toBeNull();
  expect(ui.getByLabelText('Страниц сегодня в этой книге').props.value).toBe('35');
});
test('invalid numbers never enable save', async () => {
  const ui = await mount();
  for (const value of ['', '-1', '1.5', 'abc', '1001']) {
    await fireEvent.changeText(ui.getByLabelText('Страниц сегодня в этой книге'), value);
    expect(ui.getByLabelText('Сохранить').props.accessibilityState.disabled).toBe(true);
  }
});
