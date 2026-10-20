import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useLocalDay } from '../useLocalDay';

it('updates at local midnight and on foreground, then cleans up', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-30T23:59:59'));
  let foreground: (s: string) => void = () => {};
  const remove = jest.fn();
  const clear = jest.spyOn(global, 'clearTimeout');
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, cb) => { foreground = cb as typeof foreground; return { remove }; });
  const { result, unmount } = await renderHook(useLocalDay);
  expect(result.current).toBe('2026-09-30');
  await act(async () => { jest.advanceTimersByTime(1200); });
  expect(result.current).toBe('2026-10-01');
  jest.setSystemTime(new Date('2026-10-03T12:00:00'));
  await act(async () => { foreground('active'); });
  expect(result.current).toBe('2026-10-03');
  clear.mockClear();
  await unmount();
  expect(remove).toHaveBeenCalled();
  expect(clear).toHaveBeenCalled();
  clear.mockRestore(); spy.mockRestore(); jest.useRealTimers();
});
