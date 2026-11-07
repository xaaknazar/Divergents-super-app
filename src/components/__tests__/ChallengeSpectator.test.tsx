import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { RankingScreenFrame } from '../RankingScreenFrame';
import { ChallengeSpectatorContent } from '../ChallengeSpectatorContent';
import { spectatorFixture } from '../../storybook/challengeSpectatorFixtures';
jest.mock('../Logo', () => ({ Logo: () => null }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));

it.each(['light', 'dark'] as const)('shows only rankings, filters team roster, preserves global and team places in %s', async scheme => {
  const view = await render(<ThemePreviewProvider scheme={scheme}><ChallengeSpectatorContent data={spectatorFixture} onRefresh={() => {}} /></ThemePreviewProvider>);
  expect(view.getByText(/Режим просмотра/)).toBeTruthy();
  expect(view.queryByText('План на сегодня')).toBeNull();
  expect(view.queryByText('Подать заявку')).toBeNull();
  expect(view.queryByText('Отметиться')).toBeNull();
  await fireEvent.press(view.getByTestId('standing-a'));
  expect(view.queryByTestId('standing-two')).toBeNull();
  expect(view.getByTestId('standing-three').props.accessibilityLabel).toMatch(/^2 место.*0 баллов/);
  await fireEvent.press(view.getByRole('radio', { name: 'Все' }));
  expect(view.getByTestId('standing-two')).toBeTruthy();
  expect(view.getByTestId('standing-three').props.accessibilityLabel).toMatch(/^3 место/);
});

it('does not invent flags or yesterday movement absent from the spectator API', async () => {
  const view = await render(<ThemePreviewProvider><ChallengeSpectatorContent data={spectatorFixture} onRefresh={() => {}} /></ThemePreviewProvider>);
  expect(view.getByTestId('ranking-card')).toBeTruthy();
  expect(view.queryByTestId('standing-flags-a')).toBeNull();
  expect(view.queryByTestId('standing-move-a')).toBeNull();
  await fireEvent.press(view.getByRole('radio', { name: 'Участники' }));
  expect(view.getByTestId('standing-three').props.accessibilityLabel).toMatch(/^3 место/);
  expect(view.queryByTestId('standing-flags-three')).toBeNull();
  await fireEvent.press(view.getByRole('radio', { name: 'Команды' }));
  expect(view.getByTestId('standing-b')).toBeTruthy();
});

it('shows an empty roster and supports refreshing it', async () => {
  const onRefresh = jest.fn();
  const data = { ...spectatorFixture, members: [] };
  const view = await render(<ThemePreviewProvider><RankingScreenFrame onBack={() => {}} onSeason={() => {}} onRefresh={onRefresh}><ChallengeSpectatorContent data={data} onRefresh={onRefresh} /></RankingScreenFrame></ThemePreviewProvider>);
  await fireEvent.press(view.getByTestId('standing-a'));
  expect(view.getByText('Участников пока нет')).toBeTruthy();
  await act(async () => view.getByTestId('ranking-fullscreen-scroll').props.refreshControl.props.onRefresh());
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><RankingScreenFrame onBack={() => {}} onSeason={() => {}} onRefresh={onRefresh}><ChallengeSpectatorContent data={spectatorFixture} onRefresh={onRefresh} /></RankingScreenFrame></ThemePreviewProvider>);
  expect(view.getByTestId('standing-three').props.accessibilityLabel).toMatch(/^2 место/);
});

it('uses public participant photos and movements supplied by the server', async () => {
  const data = { ...spectatorFixture, members: spectatorFixture.members.map(m => ({ ...m, avatar: 'https://utfs.io/f/public-avatar', rankChange: 2, teamRankChange: 1 })) };
  const view = await render(<ThemePreviewProvider><ChallengeSpectatorContent data={data} onRefresh={() => {}} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('radio', { name: 'Участники' }));
  expect(view.getByTestId(`standing-move-${data.members[0].id}`)).toHaveTextContent('2');
});
