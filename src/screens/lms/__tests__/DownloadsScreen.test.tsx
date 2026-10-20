import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DownloadsScreen } from '../DownloadsScreen';
import { fetchOwnedDetail } from '../../../data/api';
import type { DownloadRecord, PendingDownload } from '../../../state/downloads';

jest.mock('../../../data/api', () => ({ fetchOwnedDetail: jest.fn(), lessonAudioUrl: (lesson: any) => lesson.audioUrl }));
const mockRemove = jest.fn(); const mockCancel = jest.fn(); const mockDownload = jest.fn();
const mockPlay = jest.fn(); const mockClear = jest.fn(); const mockSeek = jest.fn();
let mockItems: DownloadRecord[] = []; let mockPending: PendingDownload[] = [];
let mockTrack: { kind: string; lessonId: string } | null = null;
let mockSignedIn = false; let mockCourses: { id: string }[] = [];
jest.mock('../../../state/downloads', () => ({ useDownloads: () => ({
  items: mockItems, pending: mockPending, removeDownload: mockRemove, cancelDownload: mockCancel, downloadLesson: mockDownload,
  isDownloaded: (id: string) => mockItems.some(item => item.lessonId === id),
  isDownloading: (id: string) => mockPending.some(item => item.lessonId === id), progress: {},
}) }));
jest.mock('../../../state/AudioPlayerContext', () => ({ useAudioPlayer: () => ({
  track: mockTrack, isPlaying: true, currentTime: 10, duration: 100, play: mockPlay, clear: mockClear, seekTo: mockSeek,
}) }));
jest.mock('@clerk/clerk-expo', () => {
  const getToken = async () => 'demo-token';
  return { useAuth: () => ({ isSignedIn: mockSignedIn, getToken }) };
});
jest.mock('../../../state/useMyCourses', () => ({ useMyCourses: () => ({ courses: mockCourses }) }));
jest.mock('../../../state/LanguageContext', () => ({ useLang: () => ({ lang: 'ru' }), tr: (value: string) => value }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));
const saved: DownloadRecord = { lessonId: 'saved', courseId: 'course', courseTitle: 'Демо курс', title: 'Демо урок', n: 1, localUri: 'file:///demo.m4a', size: 2097152, at: 1 };
beforeEach(() => {
  jest.clearAllMocks(); mockItems = [saved]; mockPending = []; mockTrack = null; mockSignedIn = false; mockCourses = [];
  mockDownload.mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('plays downloaded records through the existing shared player', async () => {
  const view = await render(<DownloadsScreen navigation={{ goBack: jest.fn() }} />);
  await fireEvent.press(view.getByRole('button', { name: '1. Демо урок. Воспроизвести' }));
  expect(mockPlay).toHaveBeenCalledWith(saved);
  expect(view.getByText('2.0 МБ · Доступно офлайн')).toBeTruthy();
});
it('keeps delete confirmation and clears only the selected download before removal', async () => {
  mockTrack = { kind: 'download', lessonId: saved.lessonId };
  const view = await render(<DownloadsScreen navigation={{ goBack: jest.fn() }} />);
  await fireEvent.press(view.getByRole('button', { name: 'Удалить загрузку' }));
  expect(mockRemove).not.toHaveBeenCalled(); expect(mockClear).not.toHaveBeenCalled();
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  await act(async () => buttons?.find(button => button.style === 'destructive')?.onPress?.());
  expect(mockClear).toHaveBeenCalledTimes(1); expect(mockRemove).toHaveBeenCalledWith('saved');
  expect(mockClear.mock.invocationCallOrder[0]).toBeLessThan(mockRemove.mock.invocationCallOrder[0]);
});
it('does not clear a website lesson with the same id on download removal', async () => {
  mockTrack = { kind: 'lesson', lessonId: saved.lessonId };
  const view = await render(<DownloadsScreen navigation={{ goBack: jest.fn() }} />);
  expect(view.queryByRole('adjustable')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Удалить загрузку' }));
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  await act(async () => buttons?.find(button => button.style === 'destructive')?.onPress?.());
  expect(mockClear).not.toHaveBeenCalled(); expect(mockRemove).toHaveBeenCalledWith('saved');
});
it('cancels an in-flight download and exposes real zero progress', async () => {
  mockPending = [{ ...saved, lessonId: 'pending', progress: 0 }];
  const view = await render(<DownloadsScreen navigation={{ goBack: jest.fn() }} />);
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  await fireEvent.press(view.getByRole('button', { name: 'Остановить загрузку' }));
  expect(mockCancel).toHaveBeenCalledWith('pending');
});
it('offers only owned audio not already downloaded or pending, preserving download input', async () => {
  mockSignedIn = true; mockCourses = [{ id: 'course' }];
  mockPending = [{ ...saved, lessonId: 'pending', progress: 0.5 }];
  jest.mocked(fetchOwnedDetail).mockResolvedValue({ id: 'course', title: 'Демо курс', lessons: [
    { id: 'saved', n: 1, title: 'Демо урок', audioUrl: 'https://example.com/saved.m4a' },
    { id: 'pending', n: 2, title: 'Загружаемый урок', audioUrl: 'https://example.com/pending.m4a' },
    { id: 'next', n: 3, title: 'Следующий урок', audioUrl: 'https://example.com/next.m4a' },
    { id: 'no-audio', title: 'Только видео' },
  ] } as any);
  const view = await render(<DownloadsScreen navigation={{ goBack: jest.fn() }} />);
  await view.findByText('3. Следующий урок');
  expect(view.getAllByRole('button', { name: 'Скачать аудио' })).toHaveLength(1);
  expect(view.queryByText('Только видео')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Скачать аудио' }));
  expect(fetchOwnedDetail).toHaveBeenCalledWith('course', 'demo-token');
  expect(mockDownload).toHaveBeenCalledWith({ lessonId: 'next', courseId: 'course', courseTitle: 'Демо курс', title: 'Следующий урок', n: 3 }, 'https://example.com/next.m4a');
});
it('keeps offline startup usable without a back action and preserves sign-in exit', async () => {
  const goBack = jest.fn(); const onExitOffline = jest.fn();
  const view = await render(<DownloadsScreen navigation={{ goBack }} offlineStandalone onExitOffline={onExitOffline} />);
  expect(view.getByText('Офлайн-уроки')).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Назад' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Войти' }));
  expect(onExitOffline).toHaveBeenCalledTimes(1); expect(goBack).not.toHaveBeenCalled();
  expect(fetchOwnedDetail).not.toHaveBeenCalled();
});
