import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ApplicantActivityReport } from '../ApplicantActivityReport';
import { EventApplicantActivity } from '../EventApplicantActivity';
import { fetchApplicantActivity, type ApplicantActivity } from '../../data/applicantActivity';
jest.mock('../../data/applicantActivity', () => ({ fetchApplicantActivity: jest.fn() }));
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ userId: 'admin', getToken: async () => 'token' }) }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => jest.requireActual('../../theme/tokens') }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));
const activity: ApplicantActivity = { applicationId: 'a', challenges: [{ challengeId: 'c', title: 'Первый сезон', teamName: 'Команда', startDate: null, status: 'finished', result: { points: 0, rank: 12, totalMembers: 20 } }],
  reading: [{ challengeId: 'r', title: 'Extreme Reading', level: 'extreme', teamName: null, joinedAt: '2026-10-21T04:00:00Z', status: 'active', result: { pages: 45, elapsedMs: 3600000, completedDays: 1, readingDays: 1, averagePages: 22.5, flags: 0 } }] };
afterEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });
it('separates regular points from reading pages, keeps zero, and displays completeness', async () => {
  const view = await render(<ApplicantActivityReport activity={activity} state="ready" completeness={85} onRetry={() => {}} />);
  expect(view.getByText('85%')).toBeTruthy();
  expect(view.getByText('Команда «Команда»')).toBeTruthy();
  expect(view.getByText('0 очков · №12 из 20')).toBeTruthy();
  expect(view.getByText('45 стр. · 60 мин чтения')).toBeTruthy();
  expect(view.getByText(/Средний темп: 22,5 стр.\/день/)).toBeTruthy();
});
it('does not turn unavailable results or profile data into zeros; retry remains actionable', async () => {
  const retry = jest.fn();
  const view = await render(<ApplicantActivityReport activity={null} state="error" completeness={null} onRetry={retry} />);
  expect(view.getByText('Нет данных')).toBeTruthy();
  expect(view.queryByText('Пока нет подтверждённых участий.')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить загрузку' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
it('late response for previous applicant cannot replace current applicant', async () => {
  let finish!: (value: ApplicantActivity) => void;
  jest.mocked(fetchApplicantActivity).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = await render(<EventApplicantActivity kind="meetup" eventId="event" applicationId="a" completeness={80} />);
  jest.mocked(fetchApplicantActivity).mockResolvedValue({ applicationId: 'b', challenges: [], reading: [] });
  await view.rerender(<EventApplicantActivity kind="meetup" eventId="event" applicationId="b" completeness={20} />);
  await act(async () => { finish(activity); });
  expect(view.queryByText('Первый сезон')).toBeNull();
  expect(view.getByText('Пока нет подтверждённых участий.')).toBeTruthy();
  expect(view.getByText('20%')).toBeTruthy();
});
it('bounded loading shows retry even if transport never completes', async () => {
  jest.useFakeTimers();
  jest.mocked(fetchApplicantActivity).mockImplementation(() => new Promise(() => {}));
  const view = await render(<EventApplicantActivity kind="meetup" eventId="event" applicationId="a" completeness={80} />);
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(view.getByRole('button', { name: 'Повторить загрузку' })).toBeTruthy();
  expect(jest.mocked(fetchApplicantActivity).mock.calls.at(-1)![4].aborted).toBe(true);
});
