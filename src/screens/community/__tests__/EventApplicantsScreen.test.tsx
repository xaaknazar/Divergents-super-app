import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventApplicantsScreen } from '../EventApplicantsScreen';
import { fetchEventApplicants, decideEventApplicant } from '../../../data/community';

jest.mock('../../../data/community', () => ({ fetchEventApplicants: jest.fn(), decideEventApplicant: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'owner', getToken: async () => 'token' }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, [cb]) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../../theme/tokens') }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));
jest.mock('../../../lib/haptics', () => ({ hSuccess: jest.fn(), hTap: jest.fn() }));

const applicant = { id: 'a', userId: 'u', userName: 'Псевдоним', status: 'pending', createdAt: 'today', fullName: 'Приватное ФИО', userEmail: 'private@test.invalid', profile: null };
const navigation = { goBack: jest.fn() } as any;
beforeEach(() => { jest.clearAllMocks(); });
function screen(canViewProfiles = false) {
  jest.mocked(fetchEventApplicants).mockResolvedValue({ applications: [applicant], canViewProfiles, counts: { total: 1, pending: 1, approved: 0, rejected: 0 } });
  return <EventApplicantsScreen navigation={navigation} route={{ key: 'apps', name: 'EventApplicants', params: { kind: 'meetup', eventId: 'm1' } }} />;
}
it('loads meetup applications without coercing them to trips; ordinary owner can approve without private fields', async () => {
  jest.mocked(decideEventApplicant).mockResolvedValue({ ok: true });
  const view = await render(screen());
  expect(fetchEventApplicants).toHaveBeenCalledWith('meetup', 'm1', 'token');
  await fireEvent.press(view.getByRole('button', { name: 'Псевдоним, Новая' }));
  expect(view.queryByText(applicant.fullName)).toBeNull();
  expect(view.queryByText(applicant.userEmail)).toBeNull();
  await fireEvent.press(view.getByText('Принять'));
  expect(decideEventApplicant).toHaveBeenCalledWith('meetup', 'm1', 'u', 'approved', 'token');
});
it('shows private fields when authorized by the server for an administrator', async () => {
  const view = await render(screen(true));
  await fireEvent.press(view.getByRole('button', { name: 'Псевдоним, Новая' }));
  expect(view.getByText(applicant.fullName)).toBeTruthy();
  expect(view.getByText(applicant.userEmail)).toBeTruthy();
});
