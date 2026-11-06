import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, processColor, StyleSheet, Text } from 'react-native';
import { resolveThemePalette } from '../../theme/ThemeContext';
import { hexToRgba } from '../../theme/personalization';
import { TAB_DOCK_HEIGHT, tabDockBottomInset, tabDockContentInset, tabDockMiniPlayerHeight, tabDockItemWidths } from '../../lib/tabDockLayout';
import { TabDock, TabDockProps } from '../TabDock';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { withSpring } from 'react-native-reanimated';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('react-native-reanimated', () => {
  const original = jest.requireActual('react-native-reanimated');
  return { ...original, __esModule: true, withSpring: jest.fn(original.withSpring) };
});
const mockDimensions = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true, default: () => mockDimensions,
}));
const mockInsets = { top: 44, bottom: 34, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => mockInsets }));

const items: TabDockProps['items'] = [
  { id: 'learn', label: 'Обучение', icon: 'book.fill', selected: true },
  { id: 'ai', label: 'AI', icon: 'sparkles.outline', selected: false },
  { id: 'community', label: 'Сообщество', icon: 'person.3', selected: false },
  { id: 'map', label: 'Карта', icon: 'map', selected: false },
  { id: 'career', label: 'Карьера', icon: 'briefcase', selected: false },
];
const originalOS = Platform.OS;
afterEach(() => { Object.defineProperty(Platform, 'OS', { value: originalOS }); mockInsets.bottom = 34; mockInsets.left = 0; mockInsets.right = 0; mockDimensions.width = 393; mockDimensions.fontScale = 1; });
const theme = (content: React.ReactNode, scheme: 'light' | 'dark' = 'light', reduceTransparency = false) => (
  <ThemePreviewProvider scheme={scheme} reduceTransparency={reduceTransparency}>{content}</ThemePreviewProvider>
);
const flattened = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as any);
const hidden = { includeHiddenElements: true };

it.each(['light', 'dark'] as const)('uses the system material and themed translucent tint in %s', async scheme => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  const view = await render(theme(<TabDock items={items} onSelect={jest.fn()} />, scheme));
  expect(view.getByTestId('tab-dock-blur', hidden).props.tint).toBe(scheme);
  const tint = view.getByTestId('tab-dock-tint', hidden);
  if (scheme === 'dark') expect(flattened(tint).backgroundColor).toBe('rgba(255,255,255,0.04)');
  else expect(tint.props.colors).toEqual(['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.42)'].map(c => processColor(c)));
  const selected = view.getByRole('tab', { name: 'Обучение' });
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 340 } } });
  // iOS 26 pill: neutral glass capsule, concentric with the dock (dock radius − 4 pt inset).
  expect(flattened(view.getByTestId('tab-dock-active-capsule', hidden)).backgroundColor).toBe(scheme === 'dark' ? 'rgba(255,255,255,0.14)' : hexToRgba(resolveThemePalette('light').brand, 0.10));
  expect(flattened(selected).borderRadius).toBe(TAB_DOCK_HEIGHT / 2 - 4);
  expect(flattened(view.getByTestId('tab-dock-surface'))).toMatchObject({ height: TAB_DOCK_HEIGHT, borderRadius: TAB_DOCK_HEIGHT / 2, overflow: 'hidden' });
  expect(flattened(selected).minHeight).toBeGreaterThanOrEqual(48);
});

it.each(['light', 'dark'] as const)('removes blur and translucency when requested in %s', async scheme => {
  const view = await render(theme(<TabDock items={items} onSelect={jest.fn()} />, scheme, true));
  expect(view.queryByTestId('tab-dock-blur', hidden)).toBeNull();
  expect(flattened(view.getByTestId('tab-dock-tint', hidden)).backgroundColor).toBe(resolveThemePalette(scheme).cardBg);
});

it('uses the inexpensive tinted fallback on Android', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  const view = await render(theme(<TabDock items={items} onSelect={jest.fn()} />));
  expect(view.queryByTestId('tab-dock-blur', hidden)).toBeNull();
  expect(flattened(view.getByTestId('tab-dock-tint', hidden)).backgroundColor).toBe(hexToRgba(resolveThemePalette('light').cardBg, 0.96));
});

it('fits the actual parent width without shortening accessible names', async () => {
  const view = await render(theme(<TabDock items={items} onSelect={jest.fn()} />));
  await fireEvent(view.getByTestId('tab-dock-surface'), 'layout', { nativeEvent: { layout: { width: 320 } } });
  expect(view.getByText('Обучение')).toBeTruthy();
  expect(view.getByText('Сообщество')).toBeTruthy();
  expect(view.getByText('Карьера')).toBeTruthy();
  expect(view.getByRole('tab', { name: 'Сообщество' })).toBeTruthy();
  await fireEvent(view.getByTestId('tab-dock-surface'), 'layout', { nativeEvent: { layout: { width: 220 } } });
  expect(view.queryByText('Обучение')).toBeNull();
  expect(view.getAllByRole('tab')).toHaveLength(5);
});

it('raises the capsule above the system gesture area and respects landscape notches', async () => {
  mockInsets.bottom = 0; mockInsets.left = 59; mockInsets.right = 59;
  const view = await render(theme(<TabDock items={items} onSelect={jest.fn()} />));
  const position = view.getByTestId('tab-dock-position');
  expect(position.props.pointerEvents).toBe('box-none');
  expect(flattened(position)).toMatchObject({ bottom: 20, left: 73, right: 73 });
  expect(flattened(position).backgroundColor).toBeUndefined();
  expect(flattened(view.getByTestId('tab-dock-surface')).paddingBottom).toBeUndefined();
});

it('keeps selection, long press, focus and the mini-player slot independent of decoration', async () => {
  const onSelect = jest.fn(), onLongPress = jest.fn();
  const view = await render(theme(<TabDock items={items} onSelect={onSelect} onLongPress={onLongPress}><Text>Сейчас играет</Text></TabDock>));
  const tab = view.getByRole('tab', { name: 'Сообщество' });
  await fireEvent.press(tab);
  await fireEvent(tab, 'longPress');
  expect(onSelect).toHaveBeenCalledWith('community');
  expect(onLongPress).toHaveBeenCalledWith('community');
  expect(view.getByText('Сейчас играет')).toBeTruthy();
  await fireEvent(view.getByTestId('tab-dock-player'), 'layout', { nativeEvent: { layout: { height: 63 } } });
  expect(flattened(view.getByTestId('tab-dock-player')).marginBottom).toBe(8);
  await fireEvent(tab, 'focus');
  expect(flattened(view.getByTestId('tab-dock-focus-ring')).borderColor).toBe(resolveThemePalette('light').brandText);
  await fireEvent(tab, 'blur');
  expect(view.queryByTestId('tab-dock-focus-ring')).toBeNull();
});

it('reserves content space for the capsule, safe area and a scalable mini-player', () => {
  expect(tabDockBottomInset(34)).toBe(42);
  expect(tabDockContentInset(34)).toBe(122);
  expect(tabDockMiniPlayerHeight(18, 14, 1)).toBe(63);
  expect(tabDockContentInset(34, tabDockMiniPlayerHeight(18, 14, 1))).toBe(193);
  expect(tabDockMiniPlayerHeight(22, 17, 2)).toBe(94);
  expect(tabDockContentInset(0)).toBe(100);
});

it('never clips oversized labels vertically and retains the native large-content title', async () => {
  mockDimensions.width = 768; mockDimensions.fontScale = 3;
  const view = await render(theme(<TabDock items={items.slice(0, 2)} onSelect={jest.fn()} />));
  expect(view.queryByText('Обучение')).toBeNull();
  const tab = view.getByRole('tab', { name: 'Обучение' });
  expect(tab.props.accessibilityShowsLargeContentViewer).toBe(true);
  expect(tab.props.accessibilityLargeContentTitle).toBe('Обучение');
  expect(view.getAllByRole('tab')).toHaveLength(2);
});

it('does not leave an empty floating surface when no destinations are supplied', async () => {
  const view = await render(theme(<TabDock items={[]} onSelect={jest.fn()} />));
  expect(view.queryByTestId('tab-dock-position')).toBeNull();
});

const selectItems = (id: string, destinations = items) => destinations.map(item => ({ ...item, selected: item.id === id }));
const motionPreview = (id: string, reduceMotion = false, destinations = items) => (
  <ThemePreviewProvider reduceMotion={reduceMotion}>
    <TabDock items={selectItems(id, destinations)} onSelect={jest.fn()} />
  </ThemePreviewProvider>
);

it('moves one non-interactive capsule to the latest tab during rapid switches', async () => {
  const view = await render(motionPreview('learn'));
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 350 } } });
  jest.mocked(withSpring).mockClear();
  await view.rerender(motionPreview('career'));
  expect(withSpring).toHaveBeenCalledWith(expect.closeTo(279.75, 2), expect.any(Object));
  await view.rerender(motionPreview('ai'));
  expect(withSpring).toHaveBeenCalledWith(expect.closeTo(78.5, 2), expect.any(Object));
  expect(view.getAllByTestId('tab-dock-active-capsule', hidden)).toHaveLength(1);
  expect(view.getByTestId('tab-dock-active-capsule', hidden).props.pointerEvents).toBe('none');
  expect(view.getByRole('tab', { name: 'AI', selected: true })).toBeTruthy();
});

it('does not animate first placement, resizing or changes to visible destinations', async () => {
  jest.mocked(withSpring).mockClear();
  const view = await render(motionPreview('community'));
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 350 } } });
  expect(withSpring).not.toHaveBeenCalled();
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 500 } } });
  expect(flattened(view.getByRole('tab', { name: 'Сообщество' })).width).toBeCloseTo(125);
  const fewer = items.filter(item => item.id === 'learn' || item.id === 'community');
  await view.rerender(motionPreview('community', false, fewer));
  expect(flattened(view.getByRole('tab', { name: 'Сообщество' })).width).toBeCloseTo(258.25);
  expect(withSpring).not.toHaveBeenCalled();
  await view.rerender(motionPreview('learn', false, fewer));
  expect(withSpring).toHaveBeenCalledWith(0, expect.any(Object));
});

it('respects reduced motion when the setting changes while the panel is mounted', async () => {
  const view = await render(motionPreview('learn'));
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 350 } } });
  await view.rerender(motionPreview('community'));
  expect(withSpring).toHaveBeenCalled();
  jest.mocked(withSpring).mockClear();
  await view.rerender(motionPreview('community', true));
  await view.rerender(motionPreview('career', true));
  expect(withSpring).not.toHaveBeenCalled();
  expect(view.getByRole('tab', { name: 'Карьера', selected: true })).toBeTruthy();
  await view.rerender(motionPreview('learn', false));
  expect(withSpring).toHaveBeenCalledWith(0, expect.any(Object));
});


it.each([283, 338, 365, 711])('keeps full titles and 44pt touch targets within a %spt row', width => {
  const widths = tabDockItemWidths([54,12,73,31,49], width);
  expect(widths.reduce((sum, value) => sum + value, 0)).toBeCloseTo(width);
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(44);
  expect(widths[2]).toBeGreaterThan(widths[1]);
});

it('uses measured bold widths to fit Community at 11pt without an alternate name', async () => {
  const view = await render(motionPreview('community'));
  await fireEvent(view.getByTestId('tab-dock-row'), 'layout', { nativeEvent: { layout: { width: 283 } } });
  for (const [index, item] of items.entries()) {
    await fireEvent(view.getByTestId(`tab-dock-measure-${item.id}`, hidden), 'textLayout', { nativeEvent: { lines: [{ width: [54,12,73,31,49][index] }] } });
  }
  const label = view.getByText('Сообщество');
  expect(label.props.adjustsFontSizeToFit).toBeUndefined();
  expect(flattened(label).fontSize).toBeGreaterThanOrEqual(11);
  expect(flattened(label).width).toBe('100%');
  expect(view.queryByText('Клуб')).toBeNull();
});
