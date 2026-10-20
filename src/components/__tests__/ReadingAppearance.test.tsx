import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ReadingAppearanceGallery } from '../ReadingAppearanceGallery';
import { ReadingChallengeHeader } from '../ReadingChallengeHeader';
import { ReadingChallengeCard } from '../ReadingChallengeCard';
import { ReadingBookIllustration, ReadingBookIllustrationProps } from '../ReadingBookIllustration';
import { ReadingJoinGuide } from '../ReadingJoinGuide';
import { DEFAULT_READING_APPEARANCE, parseReadingAppearance, READING_HEADER_STYLES } from '../../data/readingAppearance';
import { readingFixture } from '../../storybook/readingFixtures';
import { lightTheme } from '../../theme/tokens';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

test('appearance input is whitelisted and unknown values cannot become style overrides', () => {
  expect(parseReadingAppearance({ card: 'compact', header: 'cover', background: 'red' })).toEqual({ card: 'compact', header: 'cover' });
  expect(parseReadingAppearance({ card: 'unknown', header: 'padding' })).toEqual(DEFAULT_READING_APPEARANCE);
  expect(parseReadingAppearance(null)).toEqual(DEFAULT_READING_APPEARANCE);
});
test('gallery exposes exactly two cards and ten independent header choices', async () => {
  const onChange = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingAppearanceGallery value={DEFAULT_READING_APPEARANCE} onChange={onChange} /></ThemePreviewProvider>);
  expect(v.getAllByRole('button', { name: /· выбрать|· выбрано/ })).toHaveLength(12);
  await fireEvent.press(v.getByRole('button', { name: 'Компактная · выбрать' }));
  expect(onChange).toHaveBeenLastCalledWith({ card: 'compact' });
  await fireEvent.press(v.getByRole('button', { name: '07 · Обложка книги · выбрать' }));
  expect(onChange).toHaveBeenLastCalledWith({ header: 'cover' });
  expect(v.getByRole('button', { name: '01 · Тишина и бумага · выбрано', selected: true })).toBeTruthy();
});
test.each(READING_HEADER_STYLES.map(s => s.id))('%s header has no invented end date for a continuous challenge', async variant => {
  const v = await render(<ThemePreviewProvider scheme="dark"><ReadingChallengeHeader title="Читаем вместе" phase="upcoming" day={0} startDate="2026-10-20" durationDays={21} mode="continuous" variant={variant} /></ThemePreviewProvider>);
  expect(v.getByText(/Старт 20 октября 2026.*60 минут в день/)).toBeTruthy();
  expect(v.queryByText(/без даты окончания|без срока/i)).toBeNull();
  expect(v.queryByText(/21 день/)).toBeNull();
  expect(v.queryByRole('progressbar')).toBeNull();
});
test('scheduled challenges still show their real duration', async () => {
  const v = await render(<ThemePreviewProvider><ReadingChallengeHeader title="По сроку" phase="upcoming" day={0} startDate="2026-10-20" durationDays={21} /></ThemePreviewProvider>);
  expect(v.getByText(/21 день/)).toBeTruthy();
});
test('pending state explains captain review without another application action', async () => {
  const v = await render(<ThemePreviewProvider><ReadingJoinGuide state="pending" teamName="Книжный клуб" /></ThemePreviewProvider>);
  expect(v.getByText(/Повторно отправлять её не нужно/)).toBeTruthy();
  expect(v.queryAllByRole('button')).toHaveLength(0);
});

type Assert<T extends true> = T;
type IllustrationApi = Assert<Extract<keyof ReadingBookIllustrationProps, 'style' | 'className' | 'width' | 'height' | 'background'> extends never ? true : false>;
type CardApi = Assert<Extract<keyof React.ComponentProps<typeof ReadingChallengeCard>, 'style' | 'className' | 'padding' | 'color'> extends never ? true : false>;
type HeaderApi = Assert<Extract<keyof React.ComponentProps<typeof ReadingChallengeHeader>, 'style' | 'className' | 'padding' | 'color'> extends never ? true : false>;

test.each(['feature', 'compact'] as const)('%s card preserves the live title, daily goal and original press action', async variant => {
  const onPress = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingChallengeCard variant={variant} onPress={onPress}
    challenge={{ ...readingFixture, title: 'Другая настоящая книга', mode: 'continuous', membership: 'pending' }} /></ThemePreviewProvider>);
  expect(v.getByText('Другая настоящая книга')).toBeTruthy();
  expect(v.queryByText(/Extreme reading/)).toBeNull();
  expect(v.queryByText(/без даты окончания|без срока|21 день/i)).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: /Другая настоящая книга.*60 минут в день.*Заявка на рассмотрении/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('paper card is neutral, keeps its text scalable, and stacks its illustration before narrow copy', async () => {
  const v = await render(<ThemePreviewProvider><ReadingChallengeCard challenge={readingFixture} onPress={jest.fn()} /></ThemePreviewProvider>);
  const card = v.getByRole('button');
  expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe(lightTheme.cardBg);
  await fireEvent(card, 'layout', { nativeEvent: { layout: { width: 390 } } });
  expect(StyleSheet.flatten(v.getByTestId('reading-paper-composition').props.style).flexDirection).toBe('row');
  expect(v.getByTestId('reading-book-illustration-card', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent(card, 'layout', { nativeEvent: { layout: { width: 300 } } });
  expect(StyleSheet.flatten(v.getByTestId('reading-paper-composition').props.style).flexDirection).toBe('column');
  expect(v.getByTestId('reading-book-illustration-header', { includeHiddenElements: true })).toBeTruthy();
  expect(v.getByText(readingFixture.title).props.numberOfLines).toBeUndefined();
  expect(v.getByText(readingFixture.title).props.allowFontScaling).not.toBe(false);
  await v.rerender(<ThemePreviewProvider textSize="xl"><ReadingChallengeCard challenge={readingFixture} onPress={jest.fn()} /></ThemePreviewProvider>);
  await fireEvent(v.getByRole('button'), 'layout', { nativeEvent: { layout: { width: 600 } } });
  expect(StyleSheet.flatten(v.getByTestId('reading-paper-composition').props.style).flexDirection).toBe('column');
});

test('illustration is decorative, has a reserved 3:2 aspect and does not intercept reading actions', async () => {
  const v = await render(<ThemePreviewProvider><ReadingBookIllustration placement="header" /></ThemePreviewProvider>);
  const artwork = v.getByTestId('reading-book-illustration-header', { includeHiddenElements: true });
  expect(artwork.props.accessibilityElementsHidden).toBe(true);
  expect(artwork.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(artwork.props.pointerEvents).toBe('none');
  expect(StyleSheet.flatten(artwork.props.style)).toMatchObject({ aspectRatio: 1.5, maxWidth: '100%' });
});

test('paper header preserves the approved name as native wrapping text and retains scheduled progress', async () => {
  const v = await render(<ThemePreviewProvider scheme="dark"><ReadingChallengeHeader title={'"Extreme reading" Challenge'}
    phase="active" day={8} durationDays={21} startDate="2026-10-20" mode="continuous" /></ThemePreviewProvider>);
  expect(v.getByRole('header', { name: '"Extreme reading" Challenge' })).toBeTruthy();
  expect(v.getByText('Читаем каждый день.')).toBeTruthy();
  expect(v.getByText('60 минут в день')).toBeTruthy();
  expect(v.queryByRole('progressbar')).toBeNull();
  await v.rerender(<ThemePreviewProvider><ReadingChallengeHeader title="По сроку" phase="active" day={8} durationDays={21} startDate="2026-10-20" /></ThemePreviewProvider>);
  expect(v.getByText('День 8 из 21 · 60 минут для себя')).toBeTruthy();
  expect(v.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 21, now: 7 });
});
