import { fireEvent,render } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import { CreationLocationPreview } from '../CreationLocationPreview';
import { CreationSuccess,CreationSuccessProps } from '../CreationSuccess';
import { SuccessCelebration } from '../SuccessCelebration';

let mockReduceMotion = true;
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../theme/tokens');
  return { T: tokens.lightTheme, ty: tokens.ty, reduceMotion: mockReduceMotion, isDark: false };
} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: require('react-native').View, Marker: () => null }));

type Assert<T extends true> = T;
type Sealed<P> = Extract<keyof P, 'style' | 'className' | 'color' | 'size' | 'padding' | 'duration' | 'background'> extends never ? true : false;
type SuccessAPI = Assert<Sealed<CreationSuccessProps>>;
type MapAPI = Assert<Sealed<React.ComponentProps<typeof CreationLocationPreview>>>;
type CelebrationAPI = Assert<Sealed<React.ComponentProps<typeof SuccessCelebration>>>;
const props: CreationSuccessProps = { kind: 'meetup', title: 'Встреча за кофе', dateLabel: '20 октября, 19:00',
  locationLabel: 'Алматы · Парк', coordinate: { latitude: 43.258, longitude: 76.953 },
  destination: 'detail', onOpen: jest.fn(), onClose: jest.fn() };

beforeEach(() => { mockReduceMotion = true; jest.clearAllMocks(); });
afterEach(() => jest.restoreAllMocks());

it.each([
  ['meetup', 'Мероприятие создано', 'Открыть мероприятие'],
  ['trip', 'Поездка создана', 'Открыть поездку'],
  ['sport', 'Спортивная встреча создана', 'Открыть встречу'],
  ['challenge', 'Челлендж создан', 'Открыть челлендж'],
  ['channel', 'Канал создан', 'Открыть канал'],
] as const)('renders correct confirmation and callbacks for %s', async (kind, status, action) => {
  const view = await render(<CreationSuccess {...props} kind={kind} />);
  expect(view.getByText(status)).toBeTruthy();
  expect(view.getByRole('header', { name: props.title })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: action }));
  await fireEvent.press(view.getByRole('button', { name: 'Готово' }));
  await fireEvent.press(view.getByRole('button', { name: 'Закрыть результат создания' }));
  expect(props.onOpen).toHaveBeenCalledTimes(1);
  expect(props.onClose).toHaveBeenCalledTimes(2);
});

it('does not fabricate a detail link without a confirmed ID', async () => {
  const view = await render(<CreationSuccess {...props} destination="collection" />);
  expect(view.getByRole('button', { name: 'К мероприятиям' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Открыть мероприятие' })).toBeNull();
});

it('only shows a read-only location map for offline events with valid coordinates', async () => {
  const view = await render(<CreationSuccess {...props} />);
  expect(view.getByTestId('creation-location-map').props.showsUserLocation).toBe(false);
  expect(view.getByTestId('creation-location-map').props.scrollEnabled).toBe(false);
  for (const patch of [{ kind: 'challenge' as const }, { kind: 'channel' as const },
    { coordinate: undefined }, { coordinate: { latitude: NaN, longitude: 0 } }]) {
    await view.rerender(<CreationSuccess {...props} {...patch} />);
    expect(view.queryByTestId('creation-location-map')).toBeNull();
    expect(view.getByText(props.locationLabel!)).toBeTruthy();
  }
});

it('keeps confirmation and actions immediately available with Reduce Motion', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const view = await render(<CreationSuccess {...props} />);
  expect(timing).not.toHaveBeenCalled();
  expect(view.queryByTestId('success-ring')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Открыть мероприятие' }));
  expect(props.onOpen).toHaveBeenCalledTimes(1);
});

it('stops the one-shot animation on unmount instead of leaving a loop running', async () => {
  mockReduceMotion = false;
  const stop = jest.fn();
  const parallel = jest.spyOn(Animated, 'parallel').mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
  const view = await render(<SuccessCelebration />);
  expect(view.getByTestId('success-ring', { includeHiddenElements: true })).toBeTruthy();
  expect(parallel).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});
