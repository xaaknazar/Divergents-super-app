import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { EnrollmentProvider, useEnrollment } from '../EnrollmentContext';
import { fetchMyTrips, fetchMySport, fetchMyMeetups } from '../../data/api';
import { loadJSON } from '../persist';

jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ isSignedIn: true, userId: 'user-a', getToken: async () => 'token' }) }));
jest.mock('../../data/api', () => ({ fetchMyTrips: jest.fn(), fetchMySport: jest.fn(), fetchMyMeetups: jest.fn() }));
jest.mock('../persist', () => ({ loadJSON: jest.fn(), saveJSON: jest.fn() }));
jest.mock('expo-notifications', () => ({ addNotificationReceivedListener: () => ({ remove: jest.fn() }) }));

const wrapper = ({ children }: { children: React.ReactNode }) => <EnrollmentProvider>{children}</EnrollmentProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadJSON).mockResolvedValue({});
  jest.mocked(fetchMyTrips).mockResolvedValue([]);
  jest.mocked(fetchMySport).mockResolvedValue([]);
  jest.mocked(fetchMyMeetups).mockResolvedValue([]);
});

it('network failure preserves a known pending status instead of erasing it', async () => {
  jest.mocked(loadJSON).mockResolvedValue({ 'trip:t1': 'pending' });
  jest.mocked(fetchMyTrips).mockRejectedValue(new Error('offline'));
  const { result } = await renderHook(useEnrollment, { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.statusOf('trip:t1')).toBe('pending');
  expect(fetchMyTrips).toHaveBeenCalledWith('token', true);
});

it('an authoritative empty response removes a rejected membership but preserves favorites', async () => {
  jest.mocked(loadJSON).mockResolvedValue({ 'trip:t1': 'pending', 'tripfav:t1': 'approved' });
  const { result } = await renderHook(useEnrollment, { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.statusOf('trip:t1')).toBeNull();
  expect(result.current.has('tripfav:t1')).toBe(true);
});

it('a refresh started before cancellation cannot resurrect the cancelled application', async () => {
  const { result } = await renderHook(useEnrollment, { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  await act(async () => { result.current.add('trip:t1', 'pending'); });
  let resolve!: (value: { id: string; status: 'pending' }[]) => void;
  jest.mocked(fetchMyTrips).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.refresh(); });
  await act(async () => { result.current.remove('trip:t1'); });
  await act(async () => { resolve([{ id: 't1', status: 'pending' }]); await pending; });
  expect(result.current.statusOf('trip:t1')).toBeNull();
});
