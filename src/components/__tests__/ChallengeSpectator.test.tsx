import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ChallengeSpectatorContent } from '../ChallengeSpectatorContent';
import { spectatorFixture } from '../../storybook/challengeSpectatorFixtures';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));

it.each(['light', 'dark'] as const)('shows only rankings, filters team roster, preserves global and team places in %s', async scheme => {
  const view = await render(<ThemePreviewProvider scheme={scheme}><ChallengeSpectatorContent data={spectatorFixture} onRefresh={() => {}} /></ThemePreviewProvider>);
  expect(view.getByText(/Режим просмотра/)).toBeTruthy();
  expect(view.queryByText('План на сегодня')).toBeNull();
  expect(view.queryByText('Подать заявку')).toBeNull();
  expect(view.queryByText('Отметиться')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Состав команды «Демо-север»' }));
  expect(view.queryByTestId('result-ranking-member-two')).toBeNull();
  expect(view.getByTestId('result-ranking-member-three').props.accessibilityLabel).toMatch(/^2 место.*0 баллов/);
  await fireEvent.press(view.getByRole('button', { name: 'Показать всех участников' }));
  expect(view.getByTestId('result-ranking-member-two')).toBeTruthy();
  expect(view.getByTestId('result-ranking-member-three').props.accessibilityLabel).toMatch(/^3 место/);
});
