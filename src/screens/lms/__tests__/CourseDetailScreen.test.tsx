import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CourseDetailScreen } from '../CourseDetailScreen';
import { demoDetailCourse } from '../../../storybook/detailFixtures';

let mockCourse: any;
let mockMy: any;
let mockPurchases = false;
let mockCurrent = 1;
const mockLoad = jest.fn(async () => {});
const mockReload = jest.fn(async () => {});
const mockBuy = jest.fn(async () => true);
jest.mock('../../../state/CourseContext', () => ({ useCourses: () => ({
  getCourse: () => mockCourse, loadDetail: mockLoad, reload: mockReload, loading: false, error: null,
  detailLoading: {}, detailError: {}, progress: () => mockCurrent === -1 ? 1 : 0.5,
  currentLessonIndex: () => mockCurrent, lessonStatus: () => 'current',
}) }));
jest.mock('../../../state/useMyCourses', () => ({ useMyCourses: () => mockMy }));
jest.mock('../../../state/CoursePurchasesContext', () => ({ useCoursePurchases: () => ({
  available: true, phase: 'idle', message: null, buy: mockBuy, restore: jest.fn(), retry: jest.fn(),
  catalog: { enabled: mockPurchases, accountToken: mockPurchases ? 'account-token' : null,
    products: mockPurchases ? [{ courseId: mockCourse.id, productId: 'apple-product' }] : [] },
  products: mockPurchases ? [{ id: 'apple-product', title: 'Курс', displayPrice: '4 990 ₸' }] : [],
}) }));
jest.mock('../../../state/LanguageContext', () => ({ tr: (value: string) => value, useLang: () => ({}) }));
jest.mock('@clerk/clerk-expo', () => {
  const getToken = async () => 'demo-token';
  return { useAuth: () => ({ getToken, isSignedIn: true }) };
});
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../../theme/tokens'), reduceMotion: true }) }));
const navigate = jest.fn();
const screen = () => <CourseDetailScreen navigation={{ navigate, goBack: jest.fn() } as any} route={{ key: 'course', name: 'CourseDetail', params: { courseId: demoDetailCourse.id } }} />;
beforeEach(() => {
  jest.clearAllMocks(); mockPurchases = false; mockCurrent = 1;
  mockCourse = { ...demoDetailCourse };
  mockMy = { courses: [], ready: true, isSignedIn: true, error: false, reload: mockReload };
});

it('keeps locked lessons inaccessible and the free sample available with purchases disabled', async () => {
  const view = await render(screen());
  expect(view.queryByRole('button', { name: /Купить курс/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: /2\. Применяем знания/ }));
  expect(navigate).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Смотреть бесплатный урок' }));
  expect(navigate).toHaveBeenCalledWith('Video', { courseId: mockCourse.id, lessonId: 'demo-intro' });
});
it('does not show sales while owned access is unresolved', async () => {
  mockPurchases = true; mockMy.ready = false;
  const view = await render(screen());
  expect(view.queryByRole('button', { name: /Купить курс/ })).toBeNull();
  expect(view.queryByText('Курс пока не открыт')).toBeNull();
});
it('offers access retry, not another purchase, after owned-list failure', async () => {
  mockPurchases = true; mockMy.error = true;
  const view = await render(screen());
  expect(view.getByText('Не удалось проверить доступ к курсу. Проверьте подключение и попробуйте снова.')).toBeTruthy();
  expect(view.queryByRole('button', { name: /Купить курс/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(mockReload).toHaveBeenCalled();
});
it('honors confirmed detail ownership even if owned-list lookup failed', async () => {
  mockMy.error = true; mockCourse.owned = true;
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Продолжить' }));
  expect(navigate).toHaveBeenCalledWith('Video', { courseId: mockCourse.id, lessonId: 'demo-practice' });
  expect(view.getByRole('button', { name: 'Загрузки' })).toBeTruthy();
});
it('restarts a completed course from its first lesson', async () => {
  mockMy.courses = [demoDetailCourse]; mockCurrent = -1;
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Пройти заново' }));
  expect(navigate).toHaveBeenCalledWith('Video', { courseId: mockCourse.id, lessonId: 'demo-intro' });
});
it('retains gift suppression of paid controls', async () => {
  mockPurchases = true; mockCourse.gifted = true;
  const view = await render(screen());
  expect(view.getByText('Курс открыт для вас бесплатно')).toBeTruthy();
  expect(view.queryByRole('button', { name: /Купить курс/ })).toBeNull();
});
it('keeps a single purchase action and refreshes real access after successful payment', async () => {
  mockPurchases = true;
  const view = await render(screen());
  expect(view.getAllByRole('button', { name: /Купить курс/ })).toHaveLength(1);
  expect(view.queryByRole('button', { name: /Восстановить/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: /Купить курс/ }));
  expect(mockBuy).toHaveBeenCalledWith(mockCourse.id);
  expect(view.getAllByText('4 990 ₸')).toHaveLength(1);
  expect(mockReload).toHaveBeenCalled();
  expect(mockLoad).toHaveBeenLastCalledWith(mockCourse.id, 'demo-token');
});
