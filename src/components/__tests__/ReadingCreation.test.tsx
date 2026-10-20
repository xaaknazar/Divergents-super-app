import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeForm } from '../ReadingChallengeForm';
import { ReadingChallengeShelf } from '../ReadingChallengeShelf';
import { ReadingStartDateField } from '../ReadingStartDateField';
import { ReadingPublicationReview } from '../ReadingPublicationReview';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
const draft = { title: 'Одна книга ближе', startDate: '2099-01-01', durationDays: 21, teams: [{ name: 'Клуб', captainNickname: 'Reader', capacity: 20 }] };
test('empty first-load error offers retry while successful disabled catalog stays hidden', async () => {
  const retry = jest.fn();
  const props = { items: [], error: true, onRetry: retry, onOpen: jest.fn() };
  const v = await render(<ThemePreviewProvider><ReadingChallengeShelf {...props} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Повторить' })); expect(retry).toHaveBeenCalledTimes(1);
  await v.rerender(<ThemePreviewProvider><ReadingChallengeShelf {...props} error={false} /></ThemePreviewProvider>);
  expect(v.queryByText('Reading challenge')).toBeNull();
});
test('calendar commits a date explicitly and cancel preserves the existing date', async () => {
  const onChange = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingStartDateField value="2099-01-01" onChange={onChange} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: /Дата старта:/ }));
  await fireEvent(v.getByLabelText('Календарь старта'), 'onChange', { type: 'set' }, new Date(2099, 2, 5, 12));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(v.getByRole('button', { name: 'Выбрать дату' }));
  expect(onChange).toHaveBeenCalledWith('2099-03-05');
  await fireEvent.press(v.getByRole('button', { name: /Дата старта:/ }));
  await fireEvent.press(v.getByRole('button', { name: 'Отмена' })); expect(onChange).toHaveBeenCalledTimes(1);
});
test('form validates limits and duplicate captains before publication, preserves inputs', async () => {
  const submit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm initialDraft={draft} busy={false} onSubmit={submit} /></ThemePreviewProvider>);
  await fireEvent.changeText(v.getByLabelText('Длительность в днях'), '91');
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(submit).not.toHaveBeenCalled(); expect(v.getByText('Укажите от 1 до 90 дней')).toBeTruthy();
  expect(v.getByText('Проверьте поля выше: Укажите от 1 до 90 дней')).toBeTruthy();
  await fireEvent.changeText(v.getByLabelText('Длительность в днях'), '21');
  await fireEvent.press(v.getByRole('button', { name: 'Добавить команду' }));
  await fireEvent.changeText(v.getByLabelText('Псевдоним капитана команды 2'), 'reader');
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' })); expect(submit).not.toHaveBeenCalled();
  await fireEvent.press(v.getByRole('button', { name: 'Убрать команду 2' }));
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' })); expect(submit).toHaveBeenCalledWith(draft);
});
test('reading creation uses the shared creation shell and disables actions while publishing', async () => {
  const onCancel = jest.fn(), onSubmit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onCancel={onCancel} onSubmit={onSubmit} /></ThemePreviewProvider>);
  expect(v.getByRole('header', { name: 'Создать' })).toBeTruthy();
  expect(v.queryByText('Reading challenge')).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Отмена' })); expect(onCancel).toHaveBeenCalledTimes(1);
  await v.rerender(<ThemePreviewProvider><ReadingChallengeForm busy onCancel={onCancel} onSubmit={onSubmit} /></ThemePreviewProvider>);
  expect(v.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  expect(v.getByRole('button', { name: 'Опубликовать' })).toBeDisabled();
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' })); expect(onSubmit).not.toHaveBeenCalled();
});
test('new reading clubs default to ongoing without a duration field and keep captain approval', async () => {
  const onSubmit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={onSubmit} /></ThemePreviewProvider>);
  expect(v.queryByLabelText('Длительность в днях')).toBeNull();
  expect(v.getByText('Без даты окончания и выбывания. Вступление через капитана. Рейтинг по среднему времени чтения в день.')).toBeTruthy();
  await fireEvent.changeText(v.getByLabelText('Название челленджа'), 'Читаем каждый день');
  await fireEvent.changeText(v.getByLabelText('Псевдоним капитана команды 1'), 'Reader');
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ mode: 'continuous', durationDays: 1,
    teams: [{ name: 'Команда 1', captainNickname: 'Reader', capacity: 20 }] }));
});
test('new club can explicitly select scheduled mode while saved legacy drafts retain it', async () => {
  const onSubmit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={onSubmit} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByLabelText('На срок'));
  expect(v.getByLabelText('Длительность в днях')).toBeTruthy();
  await v.unmount();
  const saved = await render(<ThemePreviewProvider><ReadingChallengeForm initialDraft={draft} busy={false} onSubmit={onSubmit} /></ThemePreviewProvider>);
  expect(saved.getByLabelText('Длительность в днях')).toBeTruthy();
  await fireEvent.press(saved.getByRole('button', { name: 'Опубликовать' }));
  expect(onSubmit).toHaveBeenCalledWith(draft);
});
test('pending publication is read-only, exposes all sent data and blocks retry while sending', async () => {
  const retry = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingPublicationReview draft={draft} busy onRetry={retry} /></ThemePreviewProvider>);
  expect(v.getByText(draft.title)).toBeTruthy(); expect(v.getByText('Капитан: Reader')).toBeTruthy();
  expect(v.getByText('Мест, включая капитана: 20')).toBeTruthy();
  expect(v.getByRole('button', { name: 'Проверить публикацию' })).toBeDisabled();
});
