import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AppErrorBoundary } from '../AppErrorBoundary';

const originalError = console.error;

beforeEach(() => { console.error = jest.fn(); });
afterEach(() => { console.error = originalError; });

it('shows a recoverable fallback after a child render failure', async () => {
  let shouldThrow = true;
  const Child = () => {
    if (shouldThrow) throw new Error('boom');
    return <Text>Экран восстановлен</Text>;
  };

  const view = await render(
    <AppErrorBoundary>
      <Child />
    </AppErrorBoundary>,
  );

  expect(view.getByText('Что-то пошло не так')).toBeTruthy();
  shouldThrow = false;
  await fireEvent.press(view.getByRole('button', { name: 'Повторить загрузку' }));
  expect(view.getByText('Экран восстановлен')).toBeTruthy();
});
