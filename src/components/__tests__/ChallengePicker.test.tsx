import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChallengePicker } from '../ChallengePicker';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn() }));
const challenges = [{ id: 'first', title: 'Первый' }, { id: 'second', title: 'Второй' }];
test('workout destination is explicit and emits only the selected challenge id', async () => {
  const onChange = jest.fn();
  const view = await render(<ThemePreviewProvider><ChallengePicker challenges={challenges} selectedId="first" onChange={onChange} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: 'Первый' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getByRole('button', { name: 'Второй' }));
  expect(onChange).toHaveBeenCalledWith('second');
  await view.rerender(<ThemePreviewProvider><ChallengePicker challenges={challenges} selectedId="second" onChange={onChange} disabled /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Первый' }));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(view.getByRole('button', { name: 'Второй' }).props.accessibilityState).toMatchObject({ selected: true, disabled: true });
});
test('there is no choice control with only one membership', async () => {
  const view = await render(<ThemePreviewProvider><ChallengePicker challenges={challenges.slice(0, 1)} selectedId="first" onChange={jest.fn()} /></ThemePreviewProvider>);
  expect(view.queryByText('Зачёт тренировки в челлендж')).toBeNull();
});
