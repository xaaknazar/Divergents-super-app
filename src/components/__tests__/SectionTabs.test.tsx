import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { darkTheme, lightTheme } from '../../theme/tokens';
import { SectionTabs, SectionTabsProps } from '../SectionTabs';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
const items = [
  { id: 0, label: 'Главное' }, { id: 1, label: 'Каналы' }, { id: 2, label: 'Челленджи' },
  { id: 3, label: 'Поездки' }, { id: 4, label: 'Мероприятия' }, { id: 5, label: 'Спорт' },
];
const originalOS = Platform.OS;
afterEach(() => { Object.defineProperty(Platform, 'OS', { value: originalOS }); });
const theme = (content: React.ReactNode, reduceTransparency = false, scheme: 'light' | 'dark' = 'light') => (
  <ThemePreviewProvider reduceTransparency={reduceTransparency} scheme={scheme}>{content}</ThemePreviewProvider>
);
const flattened = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as any);
const hidden = { includeHiddenElements: true };

type Assert<T extends true> = T;
type Sealed = Assert<Extract<keyof SectionTabsProps, 'style' | 'className' | 'color' | 'padding' | 'backgroundColor'> extends never ? true : false>;

it('keeps all six destinations in one horizontal rail with complete scalable labels', async () => {
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />));
  const scroll = view.getByTestId('section-tabs-scroll');
  expect(scroll.props.horizontal).toBe(true);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).flexWrap).toBe('nowrap');
  expect(view.getAllByRole('tab')).toHaveLength(6);
  for (const item of items) {
    expect(flattened(view.getByRole('tab', { name: item.label })).minHeight).toBeGreaterThanOrEqual(48);
    expect(view.getByText(item.label).props.numberOfLines).toBeUndefined();
    expect(view.getByText(item.label).props.allowFontScaling).not.toBe(false);
  }
});

it('preserves the controlled value and gives a visible keyboard focus outline', async () => {
  const onChange = jest.fn();
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={onChange} />));
  await fireEvent.press(view.getByRole('tab', { name: 'Спорт' }));
  expect(onChange).toHaveBeenCalledWith(5);
  expect(view.getByRole('tab', { name: 'Главное' }).props.accessibilityState.selected).toBe(true);
  await view.rerender(theme(<SectionTabs items={items} value={5} onChange={onChange} />));
  const sport = view.getByRole('tab', { name: 'Спорт' });
  expect(sport.props.accessibilityState.selected).toBe(true);
  await fireEvent(sport, 'focus');
  expect(flattened(view.getByRole('tab', { name: 'Спорт' })).borderColor).toBe(lightTheme.label);
});

it('follows the light and dark theme, confined to the rail, and honors Reduce Transparency', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />));
  expect(view.getByTestId('section-tabs-blur', hidden).props.tint).toBe('light');
  expect(flattened(view.getByTestId('section-tabs-surface'))).toMatchObject({ borderRadius: 999, overflow: 'hidden' });
  expect(view.getByText('Каналы').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: lightTheme.labelSecondary })]));
  await view.rerender(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />, false, 'dark'));
  expect(view.getByTestId('section-tabs-blur', hidden).props.tint).toBe('dark');
  await view.rerender(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />, true, 'dark'));
  expect(view.queryByTestId('section-tabs-blur', hidden)).toBeNull();
  expect(flattened(view.getByTestId('section-tabs-tint', hidden)).backgroundColor).toBe(darkTheme.cardBg);
  await view.rerender(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />, true, 'light'));
  expect(flattened(view.getByTestId('section-tabs-tint', hidden)).backgroundColor).toBe(lightTheme.cardBg);
});

it('avoids the experimental Android blur renderer and leaves no empty rail', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />));
  expect(view.queryByTestId('section-tabs-blur', hidden)).toBeNull();
  await view.rerender(theme(<SectionTabs items={[]} value={0} onChange={jest.fn()} />));
  expect(view.queryByTestId('section-tabs-container')).toBeNull();
});

it('reveals an externally selected offscreen tab without animation in Reduce Motion', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={jest.fn()} />));
  await fireEvent(view.getByTestId('section-tabs-scroll'), 'layout', { nativeEvent: { layout: { width: 300 } } });
  await fireEvent(view.getByRole('tab', { name: 'Спорт' }), 'layout', { nativeEvent: { layout: { x: 580, width: 90 } } });
  await view.rerender(theme(<SectionTabs items={items} value={5} onChange={jest.fn()} />));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 374, animated: false });
  await fireEvent(view.getByRole('tab', { name: 'Главное' }), 'layout', { nativeEvent: { layout: { x: 4, width: 100 } } });
  await fireEvent(view.getByRole('tab', { name: 'Главное' }), 'focus');
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  scrollTo.mockRestore();
});
