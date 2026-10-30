import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReadingLiveActivityStatus as LiveActivityStatus } from '../../state/readingNative';
import { ReadingLiveActivityStatus } from '../ReadingLiveActivityStatus';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));

const renderStatus = (status: LiveActivityStatus | null, onRestore = jest.fn(), busy = false) =>
  render(<ThemePreviewProvider><ReadingLiveActivityStatus status={status} onRestore={onRestore} busy={busy} /></ThemePreviewProvider>);

test.each(['missing', 'ended'] as const)('%s restores only after an explicit tap', async state => {
  const onRestore = jest.fn();
  const view = await renderStatus({ state, canRestore: true }, onRestore);
  expect(view.getByText('Карточка таймера не отображается. Чтение продолжается.')).toBeTruthy();
  expect(onRestore).not.toHaveBeenCalled();
  const button = view.getByRole('button', { name: 'Показать таймер' });
  expect(button).toBeEnabled();
  await fireEvent.press(button);
  expect(onRestore).toHaveBeenCalledTimes(1);
});

test.each([
  null,
  { state: 'active', canRestore: true },
  { state: 'stale', canRestore: true },
  { state: 'paused', canRestore: false },
  { state: 'unsupported', canRestore: true },
] satisfies (LiveActivityStatus | null)[])('hides unnecessary status %j', async status => {
  const onRestore = jest.fn();
  const view = await renderStatus(status, onRestore);
  expect(view.queryByText(/Карточка|карточку/)).toBeNull();
  expect(view.queryByRole('button')).toBeNull();
  expect(onRestore).not.toHaveBeenCalled();
});

test('disabled system setting has no restore action even if canRestore is true', async () => {
  const onRestore = jest.fn();
  const view = await renderStatus({ state: 'disabled', canRestore: true }, onRestore);
  expect(view.getByText('Карточка таймера выключена в настройках iPhone.')).toBeTruthy();
  expect(view.queryByRole('button')).toBeNull();
  expect(onRestore).not.toHaveBeenCalled();
});

test('unrestorable status stays informative without an action', async () => {
  const view = await renderStatus({ state: 'missing', canRestore: false });
  expect(view.getByText('Карточка таймера не отображается. Чтение продолжается.')).toBeTruthy();
  expect(view.queryByRole('button')).toBeNull();
});

test('native errors use Russian copy and can be restored explicitly', async () => {
  const onRestore = jest.fn();
  const view = await renderStatus({ state: 'error', canRestore: true, error: 'Activity request failed' }, onRestore);
  expect(view.getByText('Не удалось показать карточку таймера. Чтение продолжается.')).toBeTruthy();
  expect(view.queryByText('Activity request failed')).toBeNull();
  expect(onRestore).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Показать таймер' }));
  expect(onRestore).toHaveBeenCalledTimes(1);
});

test('restoring disables only its button and keeps the explanation visible', async () => {
  const onRestore = jest.fn();
  const view = await renderStatus({ state: 'missing', canRestore: true }, onRestore, true);
  const button = view.getByRole('button', { name: 'Показать таймер' });
  expect(button).toBeDisabled();
  expect(button.props.accessibilityState?.busy).toBe(true);
  expect(view.getByText('Карточка таймера не отображается. Чтение продолжается.')).toBeTruthy();
  await fireEvent.press(button);
  expect(onRestore).not.toHaveBeenCalled();
});
