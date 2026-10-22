import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChallengeApplicantsScreen } from '../ChallengeApplicantsScreen';
import { fetchChallengeApplicants, decideChallengeApplication } from '../../../data/community';

jest.mock('../../../data/community', () => ({ fetchChallengeApplicants: jest.fn(), decideChallengeApplication: jest.fn(), assignTeamCaptain: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: async () => 'token' }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../../theme/tokens') }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/NavHeader', () => ({ NavHeader: () => null }));
jest.mock('../../../lib/haptics', () => ({ hSuccess: jest.fn() }));

const applicant = { id: 'a', applicantUserId: 'u', userName: 'Botik', status: 'approved', teamId: 't', teamName: 'Unity', date: '', profile: null, feedback: '', userEmail: 'private@test.invalid', fullName: '', source: 'app', coefficient: 1, isCaptain: false, telegram: null } as const;
function screen(canReviewApplications: boolean | undefined, direct = false, captain = false) {
  jest.mocked(fetchChallengeApplicants).mockResolvedValue({ applicants: [{ ...applicant, isCaptain: captain }], canManage: true, canReviewApplications, ok: true } as any);
  return <ChallengeApplicantsScreen navigation={{ goBack: jest.fn() } as any} route={{ key: 'apps', name: 'ChallengeApplicants', params: { challengeId: 'challenge', ...(direct ? { applicantUserId: 'u' } : {}) } }} />;
}
beforeEach(() => jest.clearAllMocks());
test.each([false, undefined])('locked or absent capability %s closes review even for administrators', async capability => {
  const view = await render(screen(capability));
  expect(view.getByText('Приём заявок закрыт')).toBeTruthy();
  expect(view.queryByText('Отклонить')).toBeNull(); expect(view.queryByText('Принять')).toBeNull();
  expect(decideChallengeApplication).not.toHaveBeenCalled();
});
test('active roster profile remains readable without decisions', async () => {
  const view = await render(screen(false, true));
  expect(view.getByText(applicant.userEmail)).toBeTruthy();
  expect(view.queryByText('Отклонить')).toBeNull(); expect(view.queryByText('Принять')).toBeNull();
});
test('before start application decisions still work', async () => {
  jest.mocked(decideChallengeApplication).mockResolvedValue(true);
  const view = await render(screen(true));
  await fireEvent.press(view.getByRole('button', { name: 'Botik, Unity, Принят' }));
  expect(view.getByText('Отклонить')).toBeTruthy();
  await fireEvent.press(view.getByText('Принять'));
  expect(decideChallengeApplication).toHaveBeenCalledWith('challenge', 'u', { status: 'approved', feedback: undefined }, 'token');
});
test('captain profile never exposes approval or rejection', async () => {
  const view = await render(screen(true, false, true));
  await fireEvent.press(view.getByRole('button', { name: 'Botik, Unity, Принят' }));
  expect(view.queryByText('Отклонить')).toBeNull(); expect(view.queryByText('Принять')).toBeNull();
});
