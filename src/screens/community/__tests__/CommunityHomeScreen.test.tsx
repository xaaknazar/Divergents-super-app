import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityHomeScreen } from '../CommunityHomeScreen';
import { DEFAULT_CHALLENGE, fetchCommunityHome, type ChallengeListItem } from '../../../data/community';
import { useChallenge } from '../../../state/ChallengeContext';

jest.mock('../../../data/community', () => ({
  ...jest.requireActual('../../../data/community'),
  fetchCommunityHome: jest.fn(),
}));
jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => jest.requireActual('../../../theme/tokens'),
}));
jest.mock('../../../state/ChallengeContext', () => ({ useChallenge: jest.fn() }));
jest.mock('../../../state/LanguageContext', () => ({
  useLang: () => ({ t: (key: string) => key }),
  tr: (text: string) => text,
}));
jest.mock('../../../state/EnrollmentContext', () => ({
  useEnrollment: () => ({ ready: true, has: () => false, statusOf: () => undefined }),
}));
jest.mock('../../../state/NotificationsContext', () => ({ useNotifications: () => ({ unread: 0 }) }));
jest.mock('../../../state/ChannelContext', () => ({
  useChannel: () => ({ channels: [], error: false, reload: jest.fn() }),
}));
jest.mock('../../../state/useRole', () => {
  const feature = () => true;
  return { useRole: () => ({ canCreate: false, feature }) };
});
jest.mock('../../../state/useResumeAccess', () => ({ useResumeAccess: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: jest.fn() }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('../../../components/Screen', () => ({ Screen: require('react-native').View }));
jest.mock('../../../components/PageIntro', () => ({ PageIntro: () => null }));
jest.mock('../../../components/ResumeCallout', () => ({ ResumeCallout: () => null }));
jest.mock('../../../components/ProfileAvatarButton', () => ({ ProfileAvatarButton: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/Logo', () => ({ Logo: () => null }));

const mockFetchCommunityHome = jest.mocked(fetchCommunityHome);
const mockUseChallenge = jest.mocked(useChallenge);
const navigate = jest.fn();
type ScreenProps = React.ComponentProps<typeof CommunityHomeScreen>;
const navigation = { navigate, getParent: jest.fn() } as unknown as ScreenProps['navigation'];

function catalogChallenge(id: string, title: string, status: ChallengeListItem['status']): ChallengeListItem {
  return {
    id, title, status, subtitle: '21 день полезных привычек', startLabel: '',
    durationDays: 21, maxFlags: 3, participants: 15, teams: 0, teamList: [],
    tint: '#234088', icon: 'flame.fill',
  };
}

const active = catalogChallenge('active-1', 'Осенний челлендж', 'active');
const otherActive = catalogChallenge('active-2', 'Спортивный челлендж', 'active');
const upcoming = catalogChallenge('upcoming-1', 'Следующий челлендж', 'upcoming');

function setCatalog(challenges: ChallengeListItem[]) {
  mockFetchCommunityHome.mockResolvedValue({ trips: [], sport: [], meetups: [], challenges, error: false });
}

function screen(focus?: 'challenge') {
  const route: ScreenProps['route'] = { key: 'community', name: 'CommunityHome', params: { focus } };
  return <CommunityHomeScreen navigation={navigation} route={route} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUseChallenge.mockReturnValue({
    challenge: { ...DEFAULT_CHALLENGE, id: active.id, title: active.title, currentDay: 5 },
    loading: false, error: false, isParticipant: false, syncPending: false, dayLocked: false, canMark: false,
    setMetric: jest.fn(), toggleBinary: jest.fn(), refresh: jest.fn(),
    pointsToday: 10, bonusToday: 0, leaderboard: [], myRank: 1, teamPoints: 100,
    teamFlags: 0, teamPenalty: 0,
  });
  setCatalog([active]);
});

afterEach(() => { jest.restoreAllMocks(); });

it('shows a running challenge to nonparticipants but explains the access restriction on press', async () => {
  const view = await render(screen('challenge'));

  expect(view.getByText(active.title)).toBeTruthy();
  expect(view.getByText('Челлендж идёт')).toBeTruthy();
  expect(view.getByText('Только для участников')).toBeTruthy();
  expect(view.queryByText('Войти в челлендж')).toBeNull();
  expect(view.queryByText('Набор открыт')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: `${active.title}. Челлендж идёт` }));

  expect(Alert.alert).toHaveBeenCalledWith(
    'Челлендж уже начался',
    'Доступ открыт только действующим участникам этого челленджа.',
    [{ text: 'Понятно' }],
  );
  expect(navigate).not.toHaveBeenCalled();
});

it('keeps the participant entry once and does not grant access to another running challenge', async () => {
  mockUseChallenge.mockReturnValue({ ...mockUseChallenge(), isParticipant: true });
  setCatalog([active, otherActive]);
  const view = await render(screen('challenge'));

  expect(view.getAllByText(active.title)).toHaveLength(1);
  await fireEvent.press(view.getByRole('button', { name: 'Войти в челлендж' }));
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: active.id });
  expect(Alert.alert).not.toHaveBeenCalled();

  navigate.mockClear();
  await fireEvent.press(view.getByRole('button', { name: `${otherActive.title}. Челлендж идёт` }));
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
});

it('still opens an upcoming challenge for someone who is not a participant', async () => {
  setCatalog([active, upcoming]);
  const view = await render(screen('challenge'));

  expect(view.getByText('Набор открыт')).toBeTruthy();
  await fireEvent.press(view.getByText(upcoming.title));
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: upcoming.id });
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('keeps running challenges out of a nonparticipant’s home feed', async () => {
  setCatalog([active, upcoming]);
  const view = await render(screen());

  expect(view.queryByText(active.title)).toBeNull();
  expect(view.queryByText('Войти в челлендж')).toBeNull();
  expect(view.getByText(upcoming.title)).toBeTruthy();
});

it('waits for participation to load before showing a running challenge as locked', async () => {
  mockUseChallenge.mockReturnValue({ ...mockUseChallenge(), loading: true });
  const view = await render(screen('challenge'));

  expect(view.queryByText(active.title)).toBeNull();
  expect(view.queryByText('Только для участников')).toBeNull();
  expect(view.queryByText('Сейчас нет активного челленджа')).toBeNull();

  mockUseChallenge.mockReturnValue({ ...mockUseChallenge(), loading: false, isParticipant: true });
  await view.rerender(screen('challenge'));
  await fireEvent.press(view.getByRole('button', { name: 'Войти в челлендж' }));
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: active.id });
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('opens the detail retry screen instead of denying access when participation could not be verified', async () => {
  mockUseChallenge.mockReturnValue({ ...mockUseChallenge(), error: true });
  const view = await render(screen('challenge'));

  await fireEvent.press(view.getByRole('button', { name: `${active.title}. Челлендж идёт` }));
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: active.id });
  expect(Alert.alert).not.toHaveBeenCalled();
});
