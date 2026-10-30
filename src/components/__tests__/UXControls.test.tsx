import { fireEvent,render } from '@testing-library/react-native';
import React from 'react';
import { Animated,StyleSheet } from 'react-native';
import { CourseCardPremium,FeaturedCard } from '../CourseCardPremium';
import { FilterPicker } from '../FilterPicker';
import { HeaderIcon } from '../headers';
import { NavHeader } from '../NavHeader';
import { PressableScale } from '../PressableScale';
import { SearchField } from '../SearchField';
import { EmptyState,ErrorState } from '../StateViews';
import { Button,ProgressBar,Segmented } from '../ui';

let mockDimensions = { width: 375, height: 812, fontScale: 1, scale: 3 };
let mockDark = false;
let mockReduceMotion = false;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockDimensions }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../theme/tokens');
  return { ...tokens, T: mockDark ? tokens.darkTheme : tokens.lightTheme, textScale: 1, reduceMotion: mockReduceMotion };
} }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
const course = { id: 'sample', title: 'Курс с длинным названием для проверки', category: 'Саморазвитие', lessons: [], chaptersCount: 10, tint: '#eee', icon: 'book', iconColor: '#234088' } as any;
beforeEach(() => { mockDimensions = { width: 375, height: 812, fontScale: 1, scale: 3 }; mockDark = false; mockReduceMotion = false; });
afterEach(() => jest.restoreAllMocks());

it.each(['solid', 'tinted', 'outline', 'plain'] as const)('keeps the action label and blocks resubmission while busy: %s', async variant => {
  const press = jest.fn();
  const view = await render(<Button label="Сохранить изменения" variant={variant} loading onPress={press} />);
  expect(view.getByText('Сохранить изменения')).toBeTruthy();
  const button = view.getByRole('button', { name: 'Сохранить изменения' });
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
  await fireEvent.press(button);
  expect(press).not.toHaveBeenCalled();
});

it('clears a named search field without removing its accessible name', async () => {
  const change = jest.fn();
  const view = await render(<SearchField value="Книга" onChangeText={change} placeholder="Название или автор" label="Поиск книги" />);
  expect(view.getByLabelText('Поиск книги').props.returnKeyType).toBe('search');
  await fireEvent.press(view.getByRole('button', { name: 'Очистить поиск' }));
  expect(change).toHaveBeenCalledWith('');
});

it('discloses all categories, reports selection and closes after a choice', async () => {
  const change = jest.fn();
  const view = await render(<FilterPicker label="Жанр" value="Все" items={['Все', 'Личное развитие и самореализация']} onChange={change} />);
  await fireEvent.press(view.getByRole('button', { name: 'Жанр: Все' }));
  expect(view.getByRole('button', { name: 'Все' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getByRole('button', { name: 'Личное развитие и самореализация' }));
  expect(change).toHaveBeenCalledWith('Личное развитие и самореализация');
  expect(view.getByRole('button', { name: 'Жанр: Все' }).props.accessibilityState.expanded).toBe(false);
});

it.each([1, 2])('keeps navigation actions and full title separate at font scale %s', async fontScale => {
  mockDimensions.fontScale = fontScale;
  const back = jest.fn(); const save = jest.fn();
  const title = 'Мероприятия и спортивные активности';
  const view = await render(<NavHeader title={title} backLabel="Сообщество" onBack={back} trailing={<HeaderIcon name="checkmark" label="Сохранить" onPress={save} />} />);
  expect(view.getByRole('header', { name: title })).toBeTruthy();
  expect(view.getByText(title).props.numberOfLines).toBeUndefined();
  await fireEvent.press(view.getByRole('button', { name: 'Сообщество' }));
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить' }));
  expect(back).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledTimes(1);
});

it('stacks large-text segmented choices and exposes their checked state', async () => {
  mockDimensions.fontScale = 2;
  const change = jest.fn();
  const view = await render(<Segmented items={['По рейтингу', 'По названию', 'Новые']} value={1} onChange={change} />);
  expect(StyleSheet.flatten(view.getByTestId('segmented-control').props.style).flexDirection).toBe('column');
  expect(view.getByRole('radio', { name: 'По названию' }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(view.getByRole('radio', { name: 'Новые' }));
  expect(change).toHaveBeenCalledWith(2);
});

it('does not interact with disabled segmented controls', async () => {
  const view = await render(<Segmented items={['Да', 'Нет']} value={0} />);
  expect(view.getByRole('radio', { name: 'Да' }).props.accessibilityState.disabled).toBe(true);
});

it.each([false, true])('offers explicit empty/error recovery in dark=%s', async dark => {
  mockDark = dark;
  const retry = jest.fn();
  const view = await render(<><EmptyState title="Ничего не найдено" actionLabel="Сбросить фильтры" onAction={retry} /><ErrorState message="Попробуйте снова" onRetry={retry} /></>);
  await fireEvent.press(view.getByRole('button', { name: 'Сбросить фильтры' }));
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(retry).toHaveBeenCalledTimes(2);
  expect(view.getByRole('alert').props.children).toBe('Попробуйте снова');
});

it('avoids scale animation when reduced motion is on', async () => {
  mockReduceMotion = true;
  const spring = jest.spyOn(Animated, 'spring');
  const press = jest.fn();
  const view = await render(<PressableScale accessibilityLabel="Карточка" onPress={press}><></></PressableScale>);
  const button = view.getByRole('button', { name: 'Карточка' });
  await fireEvent(button, 'pressIn'); await fireEvent(button, 'pressOut'); await fireEvent.press(button);
  expect(spring).not.toHaveBeenCalled(); expect(press).toHaveBeenCalledTimes(1);
});

it('keeps large course titles readable and includes progress in their accessible name', async () => {
  mockDimensions.fontScale = 2;
  const view = await render(<><CourseCardPremium course={course} owned progress={40} onPress={jest.fn()} /><FeaturedCard course={course} onPress={jest.fn()} /></>);
  expect(view.getByRole('button', { name: `${course.title}. 10 уроков. 40% пройдено` })).toBeTruthy();
  view.getAllByText(course.title).forEach(title => expect(title.props.numberOfLines).toBeUndefined());
});

it('does not announce an invalid progress value', async () => {
  const view = await render(<ProgressBar value={NaN} />);
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
});
