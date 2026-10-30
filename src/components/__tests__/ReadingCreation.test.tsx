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
test('form validates the title before publication and preserves inputs', async () => {
  const submit = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={submit} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(submit).not.toHaveBeenCalled(); expect(v.getByText('Проверьте поля выше: Название — от 2 до 120 символов')).toBeTruthy();
  await fireEvent.changeText(v.getByLabelText('Название челленджа'), 'Читаем каждый день');
  await fireEvent.press(v.getByRole('button', { name: 'Опубликовать' }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Читаем каждый день', mode: 'continuous', teams: [] }));
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
test('new reading clubs are individual and ongoing: no duration, teams or captains', async () => {
  const v = await render(<ThemePreviewProvider><ReadingChallengeForm busy={false} onSubmit={jest.fn()} /></ThemePreviewProvider>);
  expect(v.queryByLabelText('Длительность в днях')).toBeNull();
  expect(v.queryByText(/Псевдоним капитана|Добавить команду/)).toBeNull();
  expect(v.getByText(/Индивидуальный зачёт: без команд и капитанов/)).toBeTruthy();
});
test('pending publication is read-only, exposes all sent data and blocks retry while sending', async () => {
  const retry = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingPublicationReview draft={draft} busy onRetry={retry} /></ThemePreviewProvider>);
  expect(v.getByText(draft.title)).toBeTruthy(); expect(v.getByText('Капитан: Reader')).toBeTruthy();
  expect(v.getByText('Мест, включая капитана: 20')).toBeTruthy();
  expect(v.getByRole('button', { name: 'Проверить публикацию' })).toBeDisabled();
});
