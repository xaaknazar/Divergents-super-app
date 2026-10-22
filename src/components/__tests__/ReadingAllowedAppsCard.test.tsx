import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingAllowedAppsCard, ReadingAllowedAppsView } from '../ReadingAllowedAppsCard';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const value = (): ReadingAllowedAppsView => ({ count: 2, editable: true, busy: false, needsReselection: false,
  choose: jest.fn(), retry: jest.fn() });

test('shows confirmed exceptions, explains the iOS limit and opens the system choice', async () => {
  const model = value();
  const v = await render(<ThemePreviewProvider><ReadingAllowedAppsCard value={model} /></ThemePreviewProvider>);
  expect(v.getByText('Разрешено приложений: 2')).toBeTruthy();
  expect(v.getByText(/iOS не позволяет нам проверить/)).toBeTruthy();
  await fireEvent.press(v.getByRole('button', { name: 'Настроить разрешённые приложения' }));
  expect(model.choose).toHaveBeenCalledTimes(1);
});
test('unknown selection is never shown as zero; retry does not change a timer', async () => {
  const model = { ...value(), count: null, editable: false, error: 'Не удалось загрузить исключения' };
  const v = await render(<ThemePreviewProvider><ReadingAllowedAppsCard value={model} /></ThemePreviewProvider>);
  expect(v.getByText('Список исключений пока не загружен.')).toBeTruthy();
  expect(v.queryByText('Разрешено приложений: 0')).toBeNull();
  expect(v.getByRole('button', { name: 'Выбрать читалки' })).toBeDisabled();
  await fireEvent.press(v.getByRole('button', { name: 'Повторить' }));
  expect(model.retry).toHaveBeenCalledTimes(1);
  expect(model.choose).not.toHaveBeenCalled();
});
test('an active or paused approach cannot edit exceptions', async () => {
  const model = { ...value(), editable: false };
  const v = await render(<ThemePreviewProvider><ReadingAllowedAppsCard value={model} /></ThemePreviewProvider>);
  const button = v.getByRole('button', { name: 'Настроить разрешённые приложения' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(model.choose).not.toHaveBeenCalled();
  expect(v.getByText(/На паузе исключения не меняются/)).toBeTruthy();
});
test('revoked authorization asks for a new choice instead of claiming old exceptions work', async () => {
  const v = await render(<ThemePreviewProvider textSize="xl"><ReadingAllowedAppsCard value={{ ...value(), needsReselection: true }} /></ThemePreviewProvider>);
  expect(v.getByText('Доступ Экранного времени изменился — выберите читалки заново.')).toBeTruthy();
  expect(v.queryByText('Разрешено приложений: 2')).toBeNull();
});
