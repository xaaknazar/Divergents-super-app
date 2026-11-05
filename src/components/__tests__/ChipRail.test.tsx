import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { ChipRail, type ChipRailItem } from '../ChipRail';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn() }));

const labels = ['Главное', 'Каналы', 'Челленджи', 'Поездки', 'Мероприятия', 'Спорт'];
const hidden = { includeHiddenElements: true };
const fade = (view: Rendered, side: 'previous' | 'next') => view.queryByTestId(`chip-rail-fade-${side}`, hidden);
type Rendered = Awaited<ReturnType<typeof render>>;
type RailProps = React.ComponentProps<typeof ChipRail>;
type Assert<T extends true> = T;
type SealedRail = Assert<Extract<keyof RailProps, 'style' | 'className' | 'color' | 'padding' | 'backgroundColor'> extends never ? true : false>;
type SealedItem = Assert<Extract<keyof ChipRailItem, 'style' | 'className' | 'color' | 'padding' | 'backgroundColor'> extends never ? true : false>;

function items(active = 0, onPress = jest.fn()): ChipRailItem[] {
  return labels.map((label, index) => ({
    key: String(index),
    label,
    active: index === active,
    onPress: () => onPress(index),
  }));
}

function rail(props: Partial<RailProps> = {}, reduceMotion = false) {
  return <ThemePreviewProvider reduceMotion={reduceMotion}>
    <ChipRail items={items()} overflowHint {...props} />
  </ThemePreviewProvider>;
}

async function measure(view: Rendered, viewport = 300, content = 800) {
  const scroll = view.getByTestId('chip-rail-scroll');
  await fireEvent(scroll, 'layout', { nativeEvent: { layout: { width: viewport, height: 48, x: 0, y: 0 } } });
  await fireEvent(scroll, 'contentSizeChange', content, 48);
}

async function move(view: Rendered, x: number) {
  await fireEvent(view.getByTestId('chip-rail-scroll'), 'scroll', {
    nativeEvent: { contentOffset: { x, y: 0 } },
  });
}

async function placeItem(view: Rendered, key: string, x: number, width: number) {
  await fireEvent(view.getByTestId(`chip-rail-item-${key}`), 'layout', {
    nativeEvent: { layout: { x, y: 0, width, height: 48 } },
  });
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it('fades only the edges that have more content, without controls over the pills', async () => {
  const view = await render(rail());
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeNull();
  await measure(view);
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeTruthy();
  expect(fade(view, 'next')!.props.pointerEvents).toBe('none');
  expect(view.queryAllByRole('button').filter(b => /фильтры/.test(b.props.accessibilityLabel ?? ''))).toHaveLength(0);

  await move(view, 200);
  expect(fade(view, 'previous')).toBeTruthy();
  expect(fade(view, 'next')).toBeTruthy();

  await move(view, 500);
  expect(fade(view, 'previous')).toBeTruthy();
  expect(fade(view, 'next')).toBeNull();

  await move(view, 0);
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeTruthy();
});

it('does not suggest scrolling when everything fits or the rail is empty', async () => {
  const view = await render(rail());
  await measure(view, 900, 800);
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeNull();
  await measure(view, 800, 800);
  expect(fade(view, 'next')).toBeNull();
  await view.rerender(rail({ items: [] }));
  expect(view.queryByTestId('chip-rail')).toBeNull();
});

it('keeps overflow hints opt-in for existing chip rails', async () => {
  const view = await render(<ThemePreviewProvider><ChipRail items={items()} /></ThemePreviewProvider>);
  await measure(view);
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeNull();
});

it('removes stale fades after a resize makes all filters visible', async () => {
  const view = await render(rail());
  await measure(view);
  await move(view, 500);
  expect(fade(view, 'previous')).toBeTruthy();
  await measure(view, 900, 800);
  expect(fade(view, 'previous')).toBeNull();
  expect(fade(view, 'next')).toBeNull();
});

it('reveals an externally selected filter and focused filter without selecting on focus', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const onPress = jest.fn();
  const view = await render(rail({ items: items(0, onPress), itemRole: 'tab' }));
  await measure(view);
  await placeItem(view, '0', 16, 100);
  await placeItem(view, '5', 650, 100);
  await view.rerender(rail({ items: items(5, onPress), itemRole: 'tab' }));
  const selectedScroll = scrollTo.mock.calls.at(-1)?.[0];
  expect(selectedScroll).toMatchObject({ animated: true });
  expect((selectedScroll as { x: number }).x).toBeGreaterThanOrEqual(450);
  expect((selectedScroll as { x: number }).x).toBeLessThanOrEqual(500);
  expect(view.getByRole('tab', { name: 'Спорт' }).props.accessibilityState.selected).toBe(true);

  await fireEvent(view.getByRole('tab', { name: 'Главное' }), 'focus');
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true });
  expect(onPress).not.toHaveBeenCalled();
  expect(view.getByRole('tab', { name: 'Спорт' }).props.accessibilityState.selected).toBe(true);
});

it('reveals the selected filter once its layout arrives after the viewport', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const view = await render(rail({ items: items(5) }));
  await measure(view);
  expect(scrollTo).not.toHaveBeenCalled();
  await placeItem(view, '5', 650, 100);
  const lastScroll = scrollTo.mock.calls.at(-1)?.[0] as { x: number; animated: boolean };
  expect(lastScroll.x).toBeGreaterThanOrEqual(450);
  expect(lastScroll.x).toBeLessThanOrEqual(500);
  expect(lastScroll.animated).toBe(false);
});

it('disables scroll animation for reduced motion on external selection and focus', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const view = await render(rail({ items: items(0), itemRole: 'tab' }, true));
  await measure(view);
  await placeItem(view, '0', 16, 100);
  await placeItem(view, '5', 650, 100);
  await view.rerender(rail({ items: items(5), itemRole: 'tab' }, true));
  expect(scrollTo.mock.calls.at(-1)?.[0]).toMatchObject({ animated: false });
  await fireEvent(view.getByRole('tab', { name: 'Главное' }), 'focus');
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
});

it('preserves full scalable labels, touch targets and controlled selection', async () => {
  const onPress = jest.fn();
  const view = await render(rail({ items: items(0, onPress), itemRole: 'tab' }));
  expect(view.getByTestId('chip-rail-scroll').props.horizontal).toBe(true);
  for (const label of labels) {
    const control = view.getByRole('tab', { name: label });
    const style = StyleSheet.flatten(control.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(view.getByText(label).props.numberOfLines).toBeUndefined();
    expect(view.getByText(label).props.allowFontScaling).not.toBe(false);
  }

  await fireEvent.press(view.getByRole('tab', { name: 'Спорт' }));
  expect(onPress).toHaveBeenCalledWith(5);
  expect(view.getByRole('tab', { name: 'Главное' }).props.accessibilityState.selected).toBe(true);
  expect(view.getByRole('tab', { name: 'Спорт' }).props.accessibilityState.selected).toBe(false);
  await view.rerender(rail({ items: items(5, onPress), itemRole: 'tab' }));
  expect(view.getByRole('tab', { name: 'Спорт' }).props.accessibilityState.selected).toBe(true);
});
