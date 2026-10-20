import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingLocalPause } from '../ReadingLocalPause';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));

test('local safety action is enabled without any challenge data or network state', async () => {
  const onPause = jest.fn();
  const view = await render(<ThemePreviewProvider><ReadingLocalPause onPause={onPause} /></ThemePreviewProvider>);
  const button = view.getByRole('button', { name: 'Пауза — снять ограничения' });
  expect(button).toBeEnabled();
  await fireEvent.press(button);
  expect(onPause).toHaveBeenCalledTimes(1);
  expect(view.getByText(/Сохранённый подход останется на телефоне/)).toBeTruthy();
});
