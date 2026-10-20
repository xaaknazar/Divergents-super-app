import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LMSHomeScreen } from '../LMSHomeScreen';
import { sampleCourses } from '../../../storybook/courseFixtures';
import { NO_GIFT } from '../../../data/api';

const mockReload = jest.fn(async () => {});
const mockMyReload = jest.fn(async () => {});
let mockCatalog: any;
let mockOwned: any;
let mockGift: any;
let mockDownloads: any[];
let mockFeatures: Record<string, boolean>;
jest.mock('../../../state/CourseContext', () => ({ useCourses: () => mockCatalog }));
jest.mock('../../../state/useMyCourses', () => ({ useMyCourses: () => mockOwned }));
jest.mock('../../../state/useRole', () => ({ useRole: () => ({ feature: (key: string) => mockFeatures[key] !== false, gift: mockGift }) }));
jest.mock('../../../state/downloads', () => ({ useDownloads: () => ({ items: mockDownloads }) }));
jest.mock('../../../state/useTalentProfile', () => ({ useTalentProfile: () => ({ profile: null, live: false }) }));
jest.mock('@clerk/clerk-expo', () => ({ useUser: () => ({ user: { firstName: 'Участник' } }) }));
jest.mock('../../../state/LanguageContext', () => ({
  useLang: () => ({ t: (key: string) => ({
    tab_learn: 'Обучение', search_course: 'Поиск курса', my_courses: 'Мои курсы',
    continue_: 'Продолжить', recommended: 'Рекомендуем', not_found_title: 'Ничего не найдено',
    not_found_sub: 'Попробуйте другой запрос', demo_mode: 'Демо-режим',
  }[key] ?? key) }), tr: (value: string) => value,
}));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../../theme/tokens');
  return { T: tokens.lightTheme, ty: tokens.ty, textScale: 1, reduceMotion: true };
} }));
jest.mock('../../../components/Screen', () => ({ Screen: (props: any) => {
  const View = require('react-native').View;
  return <View testID="learning-screen" {...props} />;
} }));
jest.mock('../../../components/PageIntro', () => ({ PageIntro: () => null }));
jest.mock('../../../components/ResumeCallout', () => ({ ResumeCallout: () => null }));
jest.mock('../../../components/SFIcon', () => ({ SF: () => null }));
jest.mock('../../../components/Logo', () => ({ Logo: () => null }));
jest.mock('../../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const navigate = jest.fn();
const parentNavigate = jest.fn();
const screen = () => <LMSHomeScreen navigation={{ navigate, getParent: () => ({ navigate: parentNavigate }) } as any}
  route={{ key: 'learning', name: 'LMSHome' }} />;

beforeEach(() => {
  jest.clearAllMocks();
  mockCatalog = { courses: sampleCourses, source: 'live', loading: false, error: null, reload: mockReload, progress: () => 0.6 };
  mockOwned = { courses: [], loading: false, error: false, isSignedIn: true, ready: true, reload: mockMyReload };
  mockGift = NO_GIFT;
  mockDownloads = [];
  mockFeatures = { books: true, purchases: false };
});

it('keeps search, category selection, reset and course navigation', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: 'Продуктивность' }));
  expect(view.getByRole('button', { name: 'Продуктивность' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.changeText(view.getByLabelText('Поиск курса'), 'Несуществующий курс');
  expect(view.getByText('Ничего не найдено')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Сбросить поиск и фильтр' }));
  expect(view.getByLabelText('Поиск курса').props.value).toBe('');
  expect(view.getByRole('button', { name: 'Все' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getAllByRole('button', { name: /Управление вниманием\. 12 уроков/ })[0]);
  expect(navigate).toHaveBeenCalledWith('CourseDetail', { courseId: 'storybook-focus' });
});

it('keeps local/server maximum progress and continuation ownership', async () => {
  mockOwned.courses = [{ ...sampleCourses[0], serverProgress: 20 }];
  const view = await render(screen());
  expect(view.getByRole('button', { name: /^Продолжить: .*60% пройдено$/ })).toBeTruthy();
  expect(view.queryByText('Рекомендуем')).toBeNull();
  const cards = view.getAllByRole('button', { name: /60% пройдено/ });
  expect(cards).toHaveLength(3); // continue, shelf and catalog
  await fireEvent.press(cards[0]);
  expect(navigate).toHaveBeenCalledWith('CourseDetail', { courseId: sampleCourses[0].id });
});

it('keeps gift eligibility, downloads, library and profile routes', async () => {
  mockGift = { active: true, eligible: true, until: null, courseIds: ['storybook-gift'] };
  mockDownloads = [{ id: 'download-example' }];
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', { name: /Подарок новым участникам/ }));
  await fireEvent.press(view.getByRole('button', { name: /^Скачанные, 1/ }));
  await fireEvent.press(view.getByRole('button', { name: /^Библиотека/ }));
  await fireEvent.press(view.getByRole('button', { name: 'Профиль' }));
  expect(navigate.mock.calls).toEqual([
    ['CourseDetail', { courseId: 'storybook-gift' }], ['Downloads'], ['Books'],
  ]);
  expect(parentNavigate).toHaveBeenCalledWith('ProfileTab');
});

it('does not expose a disabled library or an ineligible gift', async () => {
  mockFeatures.books = false;
  mockGift = { active: true, eligible: false, until: null, courseIds: ['storybook-gift'] };
  const view = await render(screen());
  expect(view.queryByRole('button', { name: /^Библиотека/ })).toBeNull();
  expect(view.queryByRole('button', { name: /Подарок новым участникам/ })).toBeNull();
});

it('keeps catalog failure, empty catalog and loading distinct', async () => {
  mockCatalog = { ...mockCatalog, courses: [], error: 'offline' };
  const view = await render(screen());
  expect(view.getByText('Не удалось загрузить')).toBeTruthy();
  expect(view.queryByText('Курсы скоро появятся')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(mockReload).toHaveBeenCalledTimes(1);
  mockCatalog.error = null;
  await view.rerender(screen());
  expect(view.getByText('Курсы скоро появятся')).toBeTruthy();
  mockCatalog.loading = true;
  await view.rerender(screen());
  expect(view.getByLabelText('Загрузка каталога')).toBeTruthy();
  expect(view.queryByText('Курсы скоро появятся')).toBeNull();
});

it('refreshes catalog and owned courses together', async () => {
  const view = await render(screen());
  await fireEvent(view.getByTestId('learning-screen'), 'refresh');
  expect(mockReload).toHaveBeenCalledTimes(1);
  expect(mockMyReload).toHaveBeenCalledTimes(1);
});

it('retains owned-course retry separately from the available catalog', async () => {
  mockOwned.error = true;
  const view = await render(screen());
  expect(view.getByText('Не удалось загрузить ваши курсы. Проверьте подключение.')).toBeTruthy();
  expect(view.getAllByRole('button', { name: /Управление вниманием/ }).length).toBeGreaterThan(0);
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(mockMyReload).toHaveBeenCalledTimes(1);
  expect(mockReload).not.toHaveBeenCalled();
});
