import { act, renderHook } from '@testing-library/react-native';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useChatScroll } from '../useChatScroll';
const at = (y: number) => ({ nativeEvent: { contentOffset: { y }, contentSize: { height: 1000 }, layoutMeasurement: { height: 400 } } }) as NativeSyntheticEvent<NativeScrollEvent>;
async function setup() {
  const scrollToEnd = jest.fn();
  const ref = { current: { scrollToEnd } as unknown as ScrollView };
  const view = await renderHook(() => useChatScroll(ref));
  return { ...view, scrollToEnd };
}
it('follows laid-out text at the end without restarting an animated scroll', async () => {
  const view = await setup();
  await act(() => view.result.current.scrollProps.onContentSizeChange());
  expect(view.scrollToEnd).toHaveBeenCalledWith({ animated: false });
});
it('keeps a tab re-tap at the top even when an old end-of-thread scroll event arrives', async () => {
  const view = await setup();
  await act(() => {
    view.result.current.pauseFollowing();
    view.result.current.scrollProps.onScroll(at(600));
    view.result.current.scrollProps.onContentSizeChange();
  });
  expect(view.scrollToEnd).not.toHaveBeenCalled();
  await act(() => {
    view.result.current.followNewMessage();
    view.result.current.scrollProps.onContentSizeChange();
  });
  expect(view.scrollToEnd).toHaveBeenCalledTimes(1);
});
it('leaves dragging and momentum alone, then follows only after returning to the end', async () => {
  const view = await setup();
  await act(() => {
    view.result.current.scrollProps.onScrollBeginDrag();
    view.result.current.scrollProps.onScroll(at(100));
    view.result.current.scrollProps.onContentSizeChange();
    view.result.current.scrollProps.onScrollEndDrag();
    view.result.current.scrollProps.onMomentumScrollBegin();
    view.result.current.scrollProps.onContentSizeChange();
    view.result.current.scrollProps.onMomentumScrollEnd();
    view.result.current.scrollProps.onContentSizeChange();
  });
  expect(view.scrollToEnd).not.toHaveBeenCalled();
  await act(() => {
    view.result.current.scrollProps.onScrollBeginDrag();
    view.result.current.scrollProps.onScroll(at(600));
    view.result.current.scrollProps.onScrollEndDrag();
    view.result.current.scrollProps.onContentSizeChange();
  });
  expect(view.scrollToEnd).toHaveBeenCalledTimes(1);
});
