import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { VideoScreen } from '../VideoScreen';

const mockComplete = jest.fn();
const mockOpen = jest.fn();
const mockPause = jest.fn();
let mockDone = true;
let mockLocked = false;
const lessons = [
  { id: 'first', n: 1, title: 'Первый урок', description: 'Заметки к уроку', isFree: false, hlsUrl: 'https://example.test/first.m3u8' },
  { id: 'last', n: 2, title: 'Последний урок', isFree: false, hlsUrl: 'https://example.test/last.m3u8' },
];
jest.mock('../../../state/CourseContext', () => ({ useCourses: () => ({
  getCourse: () => ({ id: 'course', title: 'Курс', price: 1000, source: 'live',
    lessons: mockLocked ? lessons.map(l => ({ ...l, hlsUrl: null })) : lessons }),
  completeLesson: mockComplete, isCompleted: () => mockDone, loadDetail: jest.fn(), detailLoading: {}, detailError: {},
}) }));
jest.mock('../../../state/useMyCourses', () => ({ useMyCourses: () => ({ ready: true, courses: mockLocked ? [] : [{ id: 'course' }] }) }));
jest.mock('../../../state/AudioPlayerContext', () => ({ useAudioPlayer: () => ({ player: { pause: mockPause }, openLesson: mockOpen }) }));
jest.mock('../../../state/ModerationContext', () => ({ useModeration: () => ({ isBlocked: () => false, block: jest.fn() }) }));
jest.mock('../../../state/downloads', () => ({ useDownloads: () => ({ isDownloaded: () => false, isDownloading: () => false }) }));
jest.mock('../../../data/api', () => ({ stripHtml: (text: string) => text ?? '', lessonAudioUrl: () => null }));
jest.mock('../../../data/achievementEvents', () => ({ captureAchievementRecorder: jest.fn() }));
jest.mock('../../../state/LanguageContext', () => ({ tr: (text: string) => text, useLang: () => ({}) }));
jest.mock('@clerk/clerk-expo', () => {
  const getToken = async () => 'test-token';
  return { useAuth: () => ({ getToken, isSignedIn: true }) };
});
jest.mock('expo-video', () => ({ VideoView: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));

const replace = jest.fn();
const goBack = jest.fn();
const screen = (lessonId = 'first') => <VideoScreen navigation={{ replace, goBack } as any}
  route={{ key: 'video', name: 'Video', params: { courseId: 'course', lessonId } }} />;
beforeEach(() => {
  jest.clearAllMocks(); mockDone = true; mockLocked = false;
  mockComplete.mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('completed lesson continues without sending completion again', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Следующий урок' }));
  expect(replace).toHaveBeenCalledWith('Video', { courseId: 'course', lessonId: 'last' });
  expect(mockComplete).not.toHaveBeenCalled();
});
test('the last completed lesson returns to the course', async () => {
  const view = await render(screen('last'));
  await fireEvent.press(view.getByRole('button', { name: 'К программе курса' }));
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(replace).not.toHaveBeenCalled();
  expect(mockComplete).not.toHaveBeenCalled();
});
test.each([true, false])('completing a lesson preserves progress acknowledgement (saved=%s)', async saved => {
  mockDone = false; mockComplete.mockResolvedValue(saved);
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Завершить урок' }));
  expect(mockComplete).toHaveBeenCalledWith('course', 'first', 'test-token');
  if (saved) expect(replace).toHaveBeenCalledWith('Video', { courseId: 'course', lessonId: 'last' });
  else {
    expect(replace).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Не удалось сохранить прогресс', expect.any(String), expect.any(Array));
  }
});
test('locked lesson returns to course without sending completion or opening playback', async () => {
  mockLocked = true; mockDone = false;
  const view = await render(screen());
  expect(view.queryByRole('button', { name: 'Завершить урок' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'К программе курса' }));
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(mockComplete).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});
test('minimize keeps background audio and never marks progress complete', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Свернуть урок' }));
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(mockPause).not.toHaveBeenCalled();
  expect(mockComplete).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledTimes(1);
});
