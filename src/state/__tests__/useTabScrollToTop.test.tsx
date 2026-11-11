import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { ThemePreviewProvider } from '../../components/ThemePreviewProvider';
import { useTabScrollToTop } from '../useTabScrollToTop';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
async function setup({ focused = true, root = true, reduceMotion = false } = {}) {
  let press: (event: { defaultPrevented: boolean }) => void = () => {};
  const unsubscribe = jest.fn();
  const parent = { getState: () => ({ type: 'tab' }), addListener: (_: string, callback: typeof press) => { press = callback; return unsubscribe; } };
  const navigation = { getState: () => ({ type: 'stack', routes: [{ key: root ? 'root' : 'another' }] }),
    isFocused: () => focused, getParent: () => parent };
  const scrollTo = jest.fn();
  const ref = { current: { scrollTo } as unknown as ScrollView };
  const wrapper = ({ children }: { children: React.ReactNode }) => <ThemePreviewProvider reduceMotion={reduceMotion}>
    <NavigationContext.Provider value={navigation as any}>
      <NavigationRouteContext.Provider value={{ key: 'root', name: 'Root' }}>{children}</NavigationRouteContext.Provider>
    </NavigationContext.Provider>
  </ThemePreviewProvider>;
  const view = await renderHook(() => useTabScrollToTop(ref), { wrapper });
  return { ...view, scrollTo, unsubscribe, tap: (event = { defaultPrevented: false }) => press(event) };
}
it('scrolls the active root to the top after other listeners have run', async () => {
  const view = await setup();
  view.tap();
  expect(view.scrollTo).not.toHaveBeenCalled();
  await act(() => jest.runAllTimers());
  expect(view.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
});
it.each([{ focused: false }, { root: false }])('leaves hidden and nested screens untouched: %j', async options => {
  const view = await setup(options); view.tap(); await act(() => jest.runAllTimers());
  expect(view.scrollTo).not.toHaveBeenCalled();
});
it('respects preventDefault even when a later listener prevents the event', async () => {
  const view = await setup(); const event = { defaultPrevented: false }; view.tap(event); event.defaultPrevented = true;
  await act(() => jest.runAllTimers()); expect(view.scrollTo).not.toHaveBeenCalled();
});
it('honors reduced motion and collapses repeated taps into one scroll', async () => {
  const view = await setup({ reduceMotion: true }); view.tap(); view.tap();
  await act(() => jest.runAllTimers());
  expect(view.scrollTo).toHaveBeenCalledTimes(1);
  expect(view.scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});
it('cleans up listener and queued frame on unmount', async () => {
  const view = await setup(); view.tap(); await view.unmount(); await act(() => jest.runAllTimers());
  expect(view.unsubscribe).toHaveBeenCalledTimes(1);
  expect(view.scrollTo).not.toHaveBeenCalled();
});
