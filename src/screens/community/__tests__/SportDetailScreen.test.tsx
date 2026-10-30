import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SportDetailScreen } from '../MeetupDetailScreen';
import { fetchSportDetail, fetchMeetupDetail } from '../../../data/community';
import { joinSport } from '../../../data/api';
import { confirmEventApplication } from '../eventApplicationConsent';
import { useEnrollment } from '../../../state/EnrollmentContext';

jest.mock('../../../data/community', () => ({ ...jest.requireActual('../../../data/community'), fetchSportDetail: jest.fn(), fetchMeetupDetail: jest.fn() }));
jest.mock('../../../data/api', () => ({ ...jest.requireActual('../../../data/api'), joinSport: jest.fn() }));
jest.mock('../eventApplicationConsent', () => ({ confirmEventApplication: jest.fn() }));
jest.mock('../../../state/EnrollmentContext', () => ({ useEnrollment: jest.fn() }));
jest.mock('../../../state/useEventRefreshSignal', () => ({ useEventRefreshSignal: () => 0 }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'user', isSignedIn: true, getToken: async () => 'token' }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, [cb]) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../../theme/tokens') }));
jest.mock('../../../state/LanguageContext', () => ({ tr: (s: string) => s }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null, NavRoundButton: () => null }));
jest.mock('../../../lib/haptics', () => ({ hSuccess: jest.fn(), hTap: jest.fn() }));

const add = jest.fn(), navigate = jest.fn();
const event = { id: 's1', title: 'Футбол', city: 'Алматы', description: 'Играем в футбол', date: '', meetAt: '2099-01-01 19:00', place: 'Стадион', meetLat: 43.2, meetLng: 76.9, price: 'Бесплатно', spots: 10, going: 3, organizer: 'Автор', imageUrl: null, tint: '#234088' };
const detail = { meetup: event, myStatus: null, canManage: false, isCreator: false, pendingCount: 0, past: false, closed: false };
const props = { route: { name: 'SportDetail', key: 'sport', params: { sportId: 's1' } }, navigation: { navigate, goBack: jest.fn() } } as any;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(fetchSportDetail).mockResolvedValue(detail);
  jest.mocked(confirmEventApplication).mockResolvedValue(true);
  jest.mocked(joinSport).mockResolvedValue({ ok: true, status: 200, reason: 'pending' });
  jest.mocked(useEnrollment).mockReturnValue({ has: () => false, add, remove: jest.fn(), toggle: jest.fn() } as any);
});
afterEach(() => jest.restoreAllMocks());

it('sports apply requires consent, uses the sports API, and remains pending until approved', async () => {
  const view = await render(<SportDetailScreen {...props} />);
  expect(fetchSportDetail).toHaveBeenCalledWith('s1', 'token');
  expect(fetchMeetupDetail).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Записаться · Бесплатно' }));
  expect(confirmEventApplication).toHaveBeenCalledTimes(1);
  expect(joinSport).toHaveBeenCalledWith('token', 's1');
  expect(add).toHaveBeenCalledWith('sport:s1', 'pending');
  expect(view.getByRole('button', { name: 'Заявка на рассмотрении' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Вы идёте ✓' })).toBeNull();
});
it('cancelling consent sends no application', async () => {
  jest.mocked(confirmEventApplication).mockResolvedValue(false);
  const view = await render(<SportDetailScreen {...props} />);
  await fireEvent.press(view.getByRole('button', { name: 'Записаться · Бесплатно' }));
  expect(joinSport).not.toHaveBeenCalled();
});
it('creator opens the correct applications list and cannot apply to their own event', async () => {
  jest.mocked(fetchSportDetail).mockResolvedValue({ ...detail, canManage: true, isCreator: true, pendingCount: 2 });
  const view = await render(<SportDetailScreen {...props} />);
  await fireEvent.press(view.getByText('Заявки'));
  expect(navigate).toHaveBeenCalledWith('EventApplicants', { kind: 'sport', eventId: 's1', title: 'Футбол' });
  await fireEvent.press(view.getByRole('button', { name: 'Вы организатор' }));
  expect(joinSport).not.toHaveBeenCalled();
});
