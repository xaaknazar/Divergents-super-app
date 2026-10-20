import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CreateReadingChallengeScreen } from '../CreateReadingChallengeScreen';
import { useReadingCreation } from '../../../state/useReadingCreation';
import { ThemePreviewProvider } from '../../../components/ThemePreviewProvider';
jest.mock('../../../state/useReadingCreation', () => ({ useReadingCreation: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('../../../components/Screen', () => ({ Screen: ({ children }: any) => children }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn(), hSuccess: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: require('react-native').View, Marker: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
const publication = { operationId: 'demo', draft: { title: 'Одна книга ближе', startDate: '2099-11-01', durationDays: 21,
  teams: [{ name: 'Клуб', captainNickname: 'Reader', capacity: 20 }] } };
const props = { navigation: { replace: jest.fn(), popTo: jest.fn(), goBack: jest.fn() } } as any;
beforeEach(() => jest.clearAllMocks());
test('only confirmed creation shows the shared receipt and opens its exact challenge', async () => {
  jest.mocked(useReadingCreation).mockReturnValue({ state: { phase: 'success', publication, challengeId: 'server-id' }, busy: false, submit: jest.fn(), reload: jest.fn() });
  const v = await render(<ThemePreviewProvider><CreateReadingChallengeScreen {...props} /></ThemePreviewProvider>);
  expect(v.getByText('Челлендж создан')).toBeTruthy();
  expect(v.getByTestId('success-celebration', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(v.getByRole('button', { name: 'Открыть челлендж' }));
  expect(props.navigation.replace).toHaveBeenCalledWith('ReadingChallenge', { challengeId: 'server-id' });
  await fireEvent.press(v.getByRole('button', { name: 'Готово' }));
  expect(props.navigation.popTo).toHaveBeenCalledWith('CommunityHome', { focus: 'challenge', refresh: expect.any(Number) });
});
test('uncertain publication never shows a success receipt or an editable replacement form', async () => {
  const submit = jest.fn();
  jest.mocked(useReadingCreation).mockReturnValue({ state: { phase: 'pending', publication }, busy: false, submit, reload: jest.fn() });
  const v = await render(<ThemePreviewProvider><CreateReadingChallengeScreen {...props} /></ThemePreviewProvider>);
  expect(v.queryByText('Челлендж создан')).toBeNull(); expect(v.queryByLabelText('Название челленджа')).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Проверить публикацию' })); expect(submit).toHaveBeenCalledWith();
});
