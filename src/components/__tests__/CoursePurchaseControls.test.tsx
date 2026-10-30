import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CoursePurchasePanel } from '../CoursePurchasePanel';
import { CoursePurchaseSettings } from '../CoursePurchaseSettings';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../theme/tokens'), textScale: 1 }) }));

test.each(['6,99\u00a0$', '149\u202f990\u00a0₸'])('keeps Apple price %s in one line, separate from the purchase action', async priceLabel => {
  const onBuy = jest.fn();
  const view = await render(<CoursePurchasePanel priceLabel={priceLabel} phase="idle" message={null} onBuy={onBuy} onRetry={jest.fn()} />);
  const normalized = priceLabel.replace(/[\u00a0\u202f]/g, ' ');
  expect(view.getByText(normalized).props.numberOfLines).toBe(1);
  expect(view.getByRole('button', { name: 'Купить курс' }).props.accessibilityHint).toContain(normalized);
  expect(view.queryByRole('button', { name: /Восстановить/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Купить курс' }));
  expect(onBuy).toHaveBeenCalledTimes(1);
});

test('pending payment offers a status check and prevents a second purchase', async () => {
  const buy = jest.fn(), retry = jest.fn();
  const view = await render(<CoursePurchasePanel priceLabel="6,99 $" phase="pending" message="Проверяем оплату" onBuy={buy} onRetry={retry} />);
  await fireEvent.press(view.getByRole('button', { name: 'Ожидаем подтверждения' }));
  expect(buy).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Проверить оплату' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test('account settings retain explicit access restoration and block repeated taps while restoring', async () => {
  const restore = jest.fn();
  const view = await render(<CoursePurchaseSettings phase="idle" message={null} onRestore={restore} />);
  await fireEvent.press(view.getByRole('button', { name: 'Восстановить доступ' }));
  expect(restore).toHaveBeenCalledTimes(1);
  await view.rerender(<CoursePurchaseSettings phase="restoring" message={null} onRestore={restore} />);
  await fireEvent.press(view.getByRole('button', { name: 'Восстановить доступ' }));
  expect(restore).toHaveBeenCalledTimes(1);
});
