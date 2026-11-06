import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { WorkoutTrackScreen } from '../WorkoutTrackScreen';
import type { WorkoutSession } from '../../../state/workoutTracker';

let mockSession: WorkoutSession;
let mockListener: ((session: WorkoutSession) => void) | undefined;
const mockAddWorkout = jest.fn((workout: object) => ({ ...workout, id: 'saved-run' }));

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../../theme/tokens');
  return { ...tokens, T: tokens.lightTheme, textScale: 1 };
} }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/ChallengePicker', () => ({ ChallengePicker: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSuccess: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ animateCamera: jest.fn(), animateToRegion: jest.fn() }));
      return <View>{children}</View>;
    }),
    Polyline: () => null,
  };
});
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 43, longitude: 76 } })),
}));
jest.mock('../../../state/ActivityContext', () => ({
  ...jest.requireActual('../../../state/ActivityContext'),
  useActivities: () => ({ addWorkout: mockAddWorkout, markAdded: jest.fn() }),
}));
jest.mock('../../../state/ChallengeContext', () => ({ useChallenge: () => ({
  challenge: { id: 'challenge', tasks: [] }, isParticipant: false, activeChallenges: [],
}) }));
jest.mock('../../../state/workoutTracker', () => ({
  getSession: () => mockSession,
  restore: async () => mockSession,
  subscribe: (listener: typeof mockListener) => {
    mockListener = listener;
    return () => { mockListener = undefined; };
  },
  elapsedSec: () => mockSession.active ? 630 : 0,
  refreshSteps: jest.fn(async () => {}),
  finish: jest.fn(async () => {
    const result = {
      coords: mockSession.coords, distanceM: mockSession.distanceM, durationSec: 630,
      movingSec: 600, type: 'run', elevationGainM: 0, steps: 1100,
    };
    mockSession = { ...mockSession, active: false, distanceM: 0, coords: [], steps: null, movingMs: 0 };
    mockListener?.(mockSession);
    return result;
  }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockSession = {
    active: true, paused: false, type: 'run',
    coords: [{ latitude: 43, longitude: 76 }, { latitude: 43.01, longitude: 76 }],
    distanceM: 1100, elevationGainM: 0, lastAltitude: null,
    startedAt: 1, elapsedBefore: 0, segmentStartedAt: 1,
    lastAt: 600_000, lastAccuracy: 5, movingMs: 600_000, rejected: 0,
    steps: 1100, stepsBefore: 0, stepsFrom: 1,
  };
  mockAddWorkout.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('keeps the saved result on screen after the tracker clears its live session', async () => {
  const navigation = { goBack: jest.fn(), dispatch: jest.fn() } as any;
  const route = { key: 'track', name: 'WorkoutTrack', params: {} } as any;
  const screen = await render(<WorkoutTrackScreen navigation={navigation} route={route} />);
  expect(screen.getByText('1.10')).toBeTruthy();
  await fireEvent.press(screen.getByText('Финиш'));
  expect(mockAddWorkout).toHaveBeenCalledWith(expect.objectContaining({ distanceM: 1100, durationSec: 630 }));
  expect(screen.getByText('Готово')).toBeTruthy();
  expect(screen.getByText('1.10')).toBeTruthy();
  expect(screen.getByText('10:30')).toBeTruthy();
  expect(screen.getByText('1100')).toBeTruthy();
  expect(screen.queryByText('0.00')).toBeNull();
});
