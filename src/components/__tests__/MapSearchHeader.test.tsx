import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { MapCityButton } from '../MapCityButton';
import { MapSearchHeader } from '../MapSearchHeader';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { resolveThemePalette } from '../../theme/ThemeContext';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('../../state/LanguageContext', () => ({ tr: (value: string) => value }));

type CityProps = React.ComponentProps<typeof MapCityButton>;
type HeaderProps = React.ComponentProps<typeof MapSearchHeader>;
type Assert<T extends true> = T;
type Sealed<P> = Extract<keyof P, 'style' | 'className' | 'contentStyle' | 'color' | 'backgroundColor' | 'padding' | 'borderRadius' | 'width' | 'maxWidth'> extends never ? true : false;
type CityContract = Assert<Sealed<CityProps>>;
type HeaderContract = Assert<Sealed<HeaderProps>>;

const props = (): HeaderProps => ({
  city: 'Алматы',
  country: 'Казахстан',
  cityPickerOpen: false,
  onChooseCity: jest.fn(),
  searchValue: '',
  onSearchChange: jest.fn(),
  onSearchFocus: jest.fn(),
  onSearchBlur: jest.fn(),
  searchPlaceholder: 'Поиск мест',
  profile: { name: 'Алия', progress: 60, badge: 2 },
  onOpenProfile: jest.fn(),
});

function luminance(hex: string) {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

it.each(['light', 'dark'] as const)('keeps city and country legible on an opaque surface in %s', async scheme => {
  const palette = resolveThemePalette(scheme);
  const view = await render(<ThemePreviewProvider scheme={scheme} reduceTransparency={false}>
    <MapCityButton city="Алматы" country="Казахстан" onPress={jest.fn()} />
  </ThemePreviewProvider>);
  const surface = StyleSheet.flatten(view.getByTestId('map-city-button').props.style);
  const city = StyleSheet.flatten(view.getByTestId('map-city-name').props.style);
  const country = StyleSheet.flatten(view.getByText('Казахстан').props.style);
  expect(surface.backgroundColor).toBe(palette.cardBg);
  expect(surface.backgroundColor).toMatch(/^#[a-f0-9]{6}$/i);
  expect(surface.opacity ?? 1).toBe(1);
  expect(city.color).toBe(palette.label);
  expect(country.color).toBe(palette.labelSecondary);
  expect(contrast(city.color, surface.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(country.color, surface.backgroundColor)).toBeGreaterThanOrEqual(4.5);
});

it('offers a named city action with a large touch target and controlled expanded state', async () => {
  const choose = jest.fn();
  const content = (expanded: boolean) => <ThemePreviewProvider>
    <MapCityButton city="Алматы" country="Казахстан" expanded={expanded} onPress={choose} />
  </ThemePreviewProvider>;
  const view = await render(content(false));
  const button = view.getByRole('button', { name: 'Выбрать город: Алматы, Казахстан' });
  const style = StyleSheet.flatten(button.props.style);
  expect(style.minHeight).toBeGreaterThanOrEqual(52);
  expect(style.minWidth).toBeGreaterThanOrEqual(48);
  expect(button.props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(button);
  expect(choose).toHaveBeenCalledTimes(1);
  expect(button.props.accessibilityState.expanded).toBe(false);
  await view.rerender(content(true));
  expect(view.getByRole('button', { name: 'Выбрать город: Алматы, Казахстан' }).props.accessibilityState.expanded).toBe(true);
});

it('does not leave an empty country label or comma when only the city is known', async () => {
  const view = await render(<ThemePreviewProvider><MapCityButton city="Астана" onPress={jest.fn()} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: 'Выбрать город: Астана' })).toBeTruthy();
  expect(view.queryByText('Казахстан')).toBeNull();
});

it('keeps long city names complete and allows larger text instead of shrinking it', async () => {
  const city = 'Петропавловск-Камчатский';
  const content = (textSize: 'md' | 'xl') => <ThemePreviewProvider textSize={textSize}>
    <MapCityButton city={city} country="Россия" onPress={jest.fn()} />
  </ThemePreviewProvider>;
  const view = await render(content('md'));
  const standardSize = StyleSheet.flatten(view.getByTestId('map-city-name').props.style).fontSize;
  await view.rerender(content('xl'));
  const name = view.getByTestId('map-city-name');
  expect(name.props.children).toBe(city);
  expect(name.props.numberOfLines).toBeUndefined();
  expect(name.props.allowFontScaling).not.toBe(false);
  expect(name.props.adjustsFontSizeToFit).not.toBe(true);
  expect(StyleSheet.flatten(name.props.style).fontSize).toBeGreaterThan(standardSize);
  expect(StyleSheet.flatten(name.props.style).maxWidth).not.toBe('42%');
});

it('places city and profile above a separate full-width search row', async () => {
  const view = await render(<ThemePreviewProvider><MapSearchHeader {...props()} /></ThemePreviewProvider>);
  const root = view.getByTestId('map-search-header');
  const location = view.getByTestId('map-location-row');
  const search = view.getByTestId('map-search-row');
  expect(StyleSheet.flatten(root.props.style).flexDirection).toBe('column');
  expect(StyleSheet.flatten(location.props.style).flexDirection).toBe('row');
  expect(location.parent).toBe(search.parent);
  const rows = location.parent!.children;
  expect(rows.indexOf(search)).toBe(rows.indexOf(location) + 1);
  expect(location.queryAll(node => node.props.testID === 'map-city-button')).toHaveLength(1);
  expect(location.queryAll(node => node.props.accessibilityLabel?.startsWith('Профиль'))).toHaveLength(1);
  expect(search.queryAll(node => node.props.placeholder === 'Поиск мест')).toHaveLength(1);
  expect(root.queryAll(node => StyleSheet.flatten(node.props.style)?.maxWidth === '42%')).toHaveLength(0);
});

it('preserves search, focus, clearing, city selection and profile actions', async () => {
  const p = props();
  p.searchValue = 'Кофе';
  const view = await render(<ThemePreviewProvider><MapSearchHeader {...p} /></ThemePreviewProvider>);
  const input = view.getByPlaceholderText('Поиск мест');
  expect(input.props.value).toBe('Кофе');
  await fireEvent.changeText(input, 'Библиотека');
  await fireEvent(input, 'focus');
  await fireEvent(input, 'blur');
  await fireEvent.press(view.getByRole('button', { name: 'Очистить поиск' }));
  await fireEvent.press(view.getByRole('button', { name: 'Выбрать город: Алматы, Казахстан' }));
  await fireEvent.press(view.getByRole('button', { name: 'Профиль, анкета заполнена на 60%, новых: 2' }));
  expect(p.onSearchChange).toHaveBeenNthCalledWith(1, 'Библиотека');
  expect(p.onSearchChange).toHaveBeenNthCalledWith(2, '');
  expect(p.onSearchFocus).toHaveBeenCalledTimes(1);
  expect(p.onSearchBlur).toHaveBeenCalledTimes(1);
  expect(p.onChooseCity).toHaveBeenCalledTimes(1);
  expect(p.onOpenProfile).toHaveBeenCalledTimes(1);
});

it('passes city picker state without changing the selected city or search value', async () => {
  const p = props();
  p.searchValue = 'Книга';
  const content = (cityPickerOpen: boolean) => <ThemePreviewProvider>
    <MapSearchHeader {...p} cityPickerOpen={cityPickerOpen} />
  </ThemePreviewProvider>;
  const view = await render(content(false));
  await view.rerender(content(true));
  expect(view.getByRole('button', { name: 'Выбрать город: Алматы, Казахстан' }).props.accessibilityState.expanded).toBe(true);
  expect(view.getByPlaceholderText('Поиск мест').props.value).toBe('Книга');
  expect(p.onSearchChange).not.toHaveBeenCalled();
});
