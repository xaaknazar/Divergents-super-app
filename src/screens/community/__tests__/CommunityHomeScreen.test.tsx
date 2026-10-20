import React from 'react';
import { useAuth } from '@clerk/clerk-expo';
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
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useFocusEffect: (cb: any) => require('react').useEffect(cb, [cb]) }));
jest.mock('../../../state/EnrollmentContext', () => {
  const refresh = jest.fn();
  return { useEnrollment: () => ({ ready: true, has: () => false, statusOf: () => undefined, refresh }) };
});
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
jest.mock('../../../state/useProfileButton', () => ({ useProfileButton: () => ({}) }));
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
  jest.mocked(useAuth).mockReturnValue({ isSignedIn: true } as ReturnType<typeof useAuth>);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUseChallenge.mockReturnValue({
    challenge: { ...DEFAULT_CHALLENGE, id: active.id, title: active.title, currentDay: 5 },
    loading: false, error: false, isParticipant: false, syncPending: false, syncError: null, dayLocked: false, canMark: false,
    setMetric: jest.fn(), toggleBinary: jest.fn(), refresh: jest.fn(),
    pointsToday: 10, bonusToday: 0, leaderboard: [], myRank: 1, teamPoints: 100,
    teamFlags: 0, teamPenalty: 0,
  });
  setCatalog([active]);
});

afterEach(() => { jest.restoreAllMocks(); });

it('opens a running challenge for nonparticipants in the read-only entry flow', async () => {
  const view = await render(screen('challenge'));

  expect(view.getByText(active.title)).toBeTruthy();
  expect(view.getByText('Челлендж идёт')).toBeTruthy();
  expect(view.getByText('Рейтинги доступны для просмотра')).toBeTruthy();
  expect(view.queryByText('Войти в челлендж')).toBeNull();
  expect(view.queryByText('Набор открыт')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: `${active.title}. Челлендж идёт` }));

  expect(Alert.alert).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: active.id });
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
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: otherActive.id });
});

it('still opens an upcoming challenge for someone who is not a participant', async () => {
  setCatalog([active, upcoming]);
  const view = await render(screen('challenge'));

  expect(view.getByText('Набор открыт')).toBeTruthy();
  await fireEvent.press(view.getByText(upcoming.title));
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: upcoming.id });
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('shows both running and upcoming challenges in a nonparticipant’s home feed without granting access', async () => {
  setCatalog([active, upcoming]);
  const view = await render(screen());

  expect(view.getByText(active.title)).toBeTruthy();
  expect(view.queryByText('Войти в челлендж')).toBeNull();
  expect(view.getByText(upcoming.title)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: `${active.title}. Челлендж идёт` }));
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: active.id });
});

it.each([undefined, 'challenge'] as const)('shows both approved active trackers and the new recruitment in %s', async focus => {
  const base = mockUseChallenge();
  const first = { ...base, isParticipant: true, challenge: { ...base.challenge, id: active.id, title: active.title } };
  const second = { ...base, isParticipant: true, challenge: { ...base.challenge, id: otherActive.id, title: otherActive.title, currentDay: 2 } };
  mockUseChallenge.mockImplementation(id => id === otherActive.id ? second : {
    ...first, activeChallenges: [first.challenge, second.challenge],
  });
  setCatalog([active, otherActive, upcoming]);
  const view = await render(screen(focus));
  for (const challenge of [active, otherActive, upcoming]) expect(view.getAllByText(challenge.title)).toHaveLength(1);
  const entries = view.getAllByRole('button', { name: 'Войти в челлендж' });
  expect(entries).toHaveLength(2);
  await fireEvent.press(entries[1]);
  expect(navigate).toHaveBeenLastCalledWith('ChallengeDetail', { challengeId: otherActive.id });
  await fireEvent.press(view.getByText(upcoming.title));
  expect(navigate).toHaveBeenLastCalledWith('ChallengeDetail', { challengeId: upcoming.id });
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
