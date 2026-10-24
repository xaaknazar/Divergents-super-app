import type { NotificationResponse } from 'expo-notifications';
import { routeFromResponse } from '../usePush';
import { navigationRef } from '../../navigation/ref';
jest.mock('@clerk/clerk-expo', () => ({ useAuth: jest.fn() }));
jest.mock('../../data/api', () => ({ registerPush: jest.fn(), unregisterPush: jest.fn() }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: {} }));
jest.mock('../../navigation/ref', () => ({ navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
  normalizeTabTarget: jest.fn((tab, screen, params) => ({ screen: tab, params: { screen, params, initial: false } })) }));
const response = { notification: { request: { content: { data: { readingAccountId: 'reader',
  target: { tab: 'CommunityTab', screen: 'ReadingChallenge', params: { challengeId: 'challenge' } } } } } } } as unknown as NotificationResponse;
beforeEach(() => { jest.clearAllMocks(); jest.mocked(navigationRef.isReady).mockReturnValue(true); });
test('a reminder opens its exact challenge for its signed-in reader', () => {
  routeFromResponse(response, true, 'reader');
  expect(navigationRef.navigate).toHaveBeenCalledWith('Tabs', { screen: 'CommunityTab', params: {
    screen: 'ReadingChallenge', params: { challengeId: 'challenge' }, initial: false } });
});
test('a stale reminder never opens another account’s reading', () => {
  routeFromResponse(response, false, 'reader'); routeFromResponse(response, true, 'other');
  expect(navigationRef.navigate).not.toHaveBeenCalled();
});
test('account change while waiting for navigation cancels the target', () => {
  jest.useFakeTimers();
  try {
    jest.mocked(navigationRef.isReady).mockReturnValue(false);
    let current = true;
    routeFromResponse(response, true, 'reader', () => current);
    current = false; jest.mocked(navigationRef.isReady).mockReturnValue(true);
    jest.advanceTimersByTime(250);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
