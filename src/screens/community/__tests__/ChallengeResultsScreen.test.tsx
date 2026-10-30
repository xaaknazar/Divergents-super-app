import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChallengeResultsScreen } from '../ChallengeResultsScreen';
import { finalResultsFixture } from '../../../storybook/challengeResultsFixtures';
import { ThemePreviewProvider } from '../../../components/ThemePreviewProvider';

jest.mock('../../../state/useChallengeResults', () => ({ useChallengeResults: () => ({ data: require('../../../storybook/challengeResultsFixtures').finalResultsFixture, loading: false, error: false, reload: jest.fn() }) }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: async () => null }) }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));

it('keeps the finished challenge ID when opening ratings and daily history from profile results', async () => {
  const navigate = jest.fn(); const goBack = jest.fn();
  const view = await render(<ThemePreviewProvider><ChallengeResultsScreen
    route={{ key: 'results', name: 'ChallengeResults', params: { challengeId: finalResultsFixture.challenge.id } }}
    navigation={{ navigate, goBack } as any} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Итоговые рейтинги' }));
  expect(navigate).toHaveBeenCalledWith('ChallengeFinalStandings', { challengeId: 'finished-season' });
  await fireEvent.press(view.getByRole('button', { name: 'По дням' }));
  expect(navigate).toHaveBeenCalledWith('ChallengeDays', { challengeId: 'finished-season' });
});
