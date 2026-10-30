import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeScreen } from '../ReadingChallengeScreen';

let mockFocus: (() => void) | undefined;
const mockReadingRefresh = jest.fn(async () => {}), mockShelfRefresh = jest.fn(async () => {}), mockAllowedRefresh = jest.fn(async () => {});
const mockAllowed = jest.fn(() => ({ retry: mockAllowedRefresh }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback: () => void) => {
  mockFocus = callback;
  require('react').useEffect(callback, [callback]);
} }));
jest.mock('../../../state/useReadingChallenge', () => ({ useReadingChallenge: () => ({
  data: { me: { userId: 'reader' }, reportedSessionIds: [], session: null }, protection: 'ready', retry: mockReadingRefresh,
}) }));
jest.mock('../../../state/useReadingLibrary', () => ({ useReadingLibrary: () => ({ retry: mockShelfRefresh }) }));
jest.mock('../../../state/useReadingAllowedApps', () => ({ useReadingAllowedApps: (...args: unknown[]) => mockAllowed(...args as []) }));
jest.mock('../../../state/useReadingBookCheck', () => ({ useReadingBookCheck: () => ({}) }));
jest.mock('../../../components/ReadingChallengeContent', () => ({ ReadingChallengeContent: () => null }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/Screen', () => ({ Screen: ({ children, onRefresh }: any) => {
  const { View, Pressable, Text } = require('react-native');
  return <View>{children}<Pressable accessibilityRole="button" onPress={onRefresh}><Text>Обновить всё</Text></Pressable></View>;
} }));

test('refreshes the shelf and exceptions on return and pull-to-refresh even with no new reading receipts', async () => {
  jest.clearAllMocks();
  const view = await render(<ReadingChallengeScreen {...({ route: { params: { challengeId: 'challenge' } }, navigation: { goBack: jest.fn() } } as any)} />);
  expect(mockAllowed).toHaveBeenCalledWith('challenge', undefined, true);
  expect(mockShelfRefresh).not.toHaveBeenCalled(); // Hook loads on mount; no duplicate first focus.
  await act(async () => { mockFocus?.(); });
  expect(mockReadingRefresh).toHaveBeenCalledTimes(1);
  expect(mockShelfRefresh).toHaveBeenCalledTimes(1);
  expect(mockAllowedRefresh).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByRole('button', { name: 'Обновить всё' }));
  expect(mockReadingRefresh).toHaveBeenCalledTimes(2);
  expect(mockShelfRefresh).toHaveBeenCalledTimes(2);
  expect(mockAllowedRefresh).toHaveBeenCalledTimes(2);
});
