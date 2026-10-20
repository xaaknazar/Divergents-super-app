import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CreateContentScreen } from '../CreateContentScreen';
import { useRole } from '../../../state/useRole';
import { createMeetup, createSport, createTrip, createChallenge, createChannel } from '../../../data/api';

jest.mock('../../../state/useRole', () => ({ useRole: jest.fn() }));
jest.mock('../../../data/api', () => ({ createMeetup: jest.fn(), createTrip: jest.fn(), createSport: jest.fn(), createChallenge: jest.fn(), createChannel: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ isSignedIn: true, getToken: async () => 'token' }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn(), CommonActions: { setParams: (params: unknown) => ({ type: 'SET_PARAMS', payload: { params } }) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn(), hSuccess: jest.fn() }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: require('react-native').View, Marker: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: require('react-native').View }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));

const props = { navigation: { goBack: jest.fn(), navigate: jest.fn(), dispatch: jest.fn(), replace: jest.fn(), popTo: jest.fn(),
  getState: () => ({ routes: [{ key: 'home', name: 'CommunityHome' }, { key: 'create', name: 'CreateContent' }] }) }, route: { name: 'CreateContent', key: 'create' } } as any;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(useRole).mockReturnValue({ isAdmin: false, has: () => false } as any);
});
afterEach(() => jest.restoreAllMocks());

it('offers all three offline types to ordinary members, but no challenge/channel or price input', async () => {
  const view = await render(<CreateContentScreen {...props} />);
  for (const label of ['Мероприятие', 'Спорт', 'Поездка']) expect(view.getByRole('button', { name: label })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Челлендж' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Канал' })).toBeNull();
  expect(view.queryByLabelText('Цена')).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Название'), 'Встреча за кофе');
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(Alert.alert).toHaveBeenCalledWith('Проверьте данные встречи', 'Укажите город');
  expect(createMeetup).not.toHaveBeenCalled();
});

it('publishes a complete free meetup and blocks duplicate success submissions', async () => {
  jest.mocked(createMeetup).mockResolvedValue({ ok: true, status: 200 });
  const view = await render(<CreateContentScreen {...props} />);
  for (const [label, value] of [['Название', 'Встреча за кофе'], ['Город встречи', 'Алматы'], ['Место', 'Кофейня у парка'], ['Мест', '5'], ['Описание', 'Знакомимся и обсуждаем любимые книги']]) {
    await fireEvent.changeText(view.getByLabelText(label), value);
  }
  await fireEvent(view.getByLabelText('Выберите дату и время'), 'onChange', {}, new Date(2099, 0, 20, 19, 0));
  await fireEvent(view.getByTestId('meeting-map'), 'onPress', { nativeEvent: { coordinate: { latitude: 43.2, longitude: 76.9 } } });
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(createMeetup).toHaveBeenCalledWith('token', expect.objectContaining({ city: 'Алматы', spots: 5, price: 'Бесплатно', meetAt: '2099-01-20 19:00', meetLat: 43.2, meetLng: 76.9, creationId: '11111111-1111-4111-8111-111111111111' }));
  expect(view.getByText('Мероприятие создано')).toBeTruthy();
  expect(view.queryByText('Опубликовать')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'К мероприятиям' }));
  expect(props.navigation.popTo).toHaveBeenCalledWith('CommunityHome', { focus: 'meetup', refresh: expect.any(Number) });
  expect(props.navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({ source: 'home' }));
  expect(createMeetup).toHaveBeenCalledTimes(1);
});

async function fillEvent(view: Awaited<ReturnType<typeof render>>) {
  const placeLabel = view.queryByLabelText('Место') ? 'Место' : 'Место встречи';
  for (const [label, value] of [['Название', 'Утренняя встреча'], ['Город встречи', 'Алматы'], [placeLabel, 'Парк'], ['Мест', '5'], ['Описание', 'Встречаемся и знакомимся']]) {
    await fireEvent.changeText(view.getByLabelText(label), value);
  }
  await fireEvent(view.getByLabelText('Выберите дату и время'), 'onChange', {}, new Date(2099, 0, 20, 19, 0));
  await fireEvent(view.getByTestId('meeting-map'), 'onPress', { nativeEvent: { coordinate: { latitude: 43.2, longitude: 76.9 } } });
}

it.each([
  ['Мероприятие', createMeetup, 'Открыть мероприятие', 'MeetupDetail', { meetupId: 'created-id' }],
  ['Спорт', createSport, 'Открыть встречу', 'SportDetail', { sportId: 'created-id' }],
  ['Поездка', createTrip, 'Открыть поездку', 'TripDetail', { tripId: 'created-id' }],
] as const)('opens the confirmed %s after replacing the completed form', async (kind, create, label, route, params) => {
  jest.mocked(create).mockResolvedValue({ ok: true, status: 201, createdId: 'created-id' });
  const view = await render(<CreateContentScreen {...props} />);
  await fireEvent.press(view.getByRole('button', { name: kind }));
  await fillEvent(view);
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(view.getByTestId('creation-location-map')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: label }));
  expect(props.navigation.replace).toHaveBeenCalledWith(route, params);
});

it.each([{ ok: false, status: 0 }, { ok: false, status: 403, message: 'Нет доступа' }])('keeps form data and shows no success for $status', async result => {
  jest.mocked(createMeetup).mockResolvedValue(result);
  const view = await render(<CreateContentScreen {...props} />);
  await fillEvent(view);
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(view.queryByTestId('creation-success')).toBeNull();
  expect(view.getByLabelText('Название').props.value).toBe('Утренняя встреча');
  expect(props.navigation.replace).not.toHaveBeenCalled();
  expect(props.navigation.dispatch).not.toHaveBeenCalled();
});

it('does not celebrate before the server replies or submit twice while waiting', async () => {
  let resolve!: (result: { ok: boolean; status: number }) => void;
  jest.mocked(createMeetup).mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = await render(<CreateContentScreen {...props} />);
  await fillEvent(view);
  await fireEvent.press(view.getByText('Опубликовать'));
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(createMeetup).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('creation-success')).toBeNull();
  await act(async () => { resolve({ ok: true, status: 201 }); });
  expect(view.getByTestId('creation-success')).toBeTruthy();
});

it.each([
  ['Челлендж', createChallenge, 'Открыть челлендж', 'ChallengeDetail', { challengeId: 'created-id' }],
  ['Канал', createChannel, 'Открыть канал', 'ServerChannel', { channelId: 'created-id' }],
] as const)('preserves permission-gated creation and opens %s without a map', async (kind, create, label, route, params) => {
  jest.mocked(useRole).mockReturnValue({ isAdmin: true, has: () => true } as any);
  jest.mocked(create).mockResolvedValue({ ok: true, status: 201, createdId: 'created-id' });
  const view = await render(<CreateContentScreen {...props} />);
  await fireEvent.press(view.getByRole('button', { name: kind }));
  await fireEvent.changeText(view.getByLabelText('Название'), 'Новый проект');
  if (kind === 'Челлендж') {
    await fireEvent(view.getByLabelText('Выберите дату'), 'onChange', {}, new Date(2099, 0, 20));
  }
  await fireEvent.press(view.getByText('Опубликовать'));
  expect(create).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(view.queryByTestId('creation-location-map')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: label }));
  expect(props.navigation.replace).toHaveBeenCalledWith(route, params);
});

it('centers the map on the selected city and clears a point from the previous city', async () => {
  const view = await render(<CreateContentScreen {...props} />);
  await fireEvent.press(view.getByRole('button', { name: 'Выбрать город Астана' }));
  expect(view.getByTestId('meeting-map').props.initialRegion.latitude).toBe(51.1605);
  await fireEvent(view.getByTestId('meeting-map'), 'onPress', { nativeEvent: { coordinate: { latitude: 51.2, longitude: 71.4 } } });
  await fireEvent.changeText(view.getByLabelText('Город встречи'), 'Алматы');
  expect(view.getByTestId('meeting-map').props.initialRegion.latitude).toBe(43.238);
});
