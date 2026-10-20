import React from 'react';
import { render } from '@testing-library/react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabDockProps } from '../../components/TabDock';
import { TabBar } from '../TabBar';

const mockDock = jest.fn((_props: TabDockProps) => null);
const mockFeature = jest.fn(() => true);
jest.mock('../../components/TabDock', () => ({ TabDock: (props: TabDockProps) => mockDock(props) }));
jest.mock('../../components/MiniPlayer', () => ({ MiniPlayer: () => null }));
jest.mock('../../lib/haptics', () => ({ hSelect: jest.fn() }));
jest.mock('../../state/LanguageContext', () => ({ useLang: () => ({ t: (value: string) => value }) }));
jest.mock('../../state/useRole', () => ({ useRole: () => ({ feature: mockFeature }) }));

const routes = ['LMSTab', 'AITab', 'CommunityTab', 'MapTab', 'CareerTab'].map(name => ({ key: `${name}-key`, name }));
function props(index = 2, customRoutes: unknown[] = routes) {
  return { state: { index, routes: customRoutes }, navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() } } as unknown as BottomTabBarProps;
}
function dock(): TabDockProps { return (mockDock.mock.calls.at(-1) as unknown as [TabDockProps])[0]; }
beforeEach(() => { mockDock.mockClear(); mockFeature.mockReturnValue(true); });

it('preserves all five existing icons, selected destination and long-press events', async () => {
  const p = props();
  await render(<TabBar {...p} />);
  expect(dock().items.map(item => item.icon)).toEqual(['book', 'sparkles.outline', 'person.3.fill', 'map', 'briefcase']);
  expect(dock().items.filter(item => item.selected).map(item => item.id)).toEqual(['CommunityTab-key']);
  dock().onSelect('LMSTab-key');
  expect(p.navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'LMSTab-key', canPreventDefault: true });
  expect(p.navigation.navigate).toHaveBeenCalledWith('LMSTab');
  dock().onLongPress?.('MapTab-key');
  expect(p.navigation.emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'MapTab-key' });
});

it('does not navigate when tabPress is prevented, the current tab is tapped, or a stale id is supplied', async () => {
  const p = props();
  await render(<TabBar {...p} />);
  dock().onSelect('CommunityTab-key');
  dock().onSelect('unknown-key');
  (p.navigation.emit as jest.Mock).mockReturnValue({ defaultPrevented: true });
  dock().onSelect('LMSTab-key');
  expect(p.navigation.navigate).not.toHaveBeenCalled();
});

it('hides the complete dock on Reading detail screens without changing active tab roots', async () => {
  const p = props(2, routes.map(route => route.name === 'CommunityTab' ? {
    ...route, state: { index: 1, routes: [{ name: 'CommunityHome' }, { name: 'ReadingChallenge' }] },
  } : route));
  await render(<TabBar {...p} />);
  expect(mockDock).not.toHaveBeenCalled();
});

it('honors feature availability while keeping the active destination reachable', async () => {
  mockFeature.mockReturnValue(false);
  await render(<TabBar {...props(3)} />);
  expect(dock().items.map(item => item.id)).toEqual(['LMSTab-key', 'CommunityTab-key', 'MapTab-key']);
});
