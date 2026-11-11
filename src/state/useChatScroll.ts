import { RefObject, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/** Follow newly laid-out text only while reading the end of the thread.
 * Repeated animated scrollToEnd calls used to compete with scrolling to older replies. */
export function useChatScroll(ref: RefObject<ScrollView | null>) {
  const following = useRef(true);
  const allowFollow = useRef(true);
  const interacting = useRef(false);
  const nearEnd = useRef(true);
  const stopInteraction = () => {
    interacting.current = false;
    following.current = allowFollow.current && nearEnd.current;
  };
  return {
    pauseFollowing: () => { following.current = false; allowFollow.current = false; },
    followNewMessage: () => { following.current = true; allowFollow.current = true; },
    scrollProps: {
      scrollEventThrottle: 16,
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        nearEnd.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 32;
        if (allowFollow.current && !interacting.current) following.current = nearEnd.current;
      },
      onScrollBeginDrag: () => { interacting.current = true; following.current = false; allowFollow.current = true; },
      onScrollEndDrag: stopInteraction,
      onMomentumScrollBegin: () => { interacting.current = true; following.current = false; },
      onMomentumScrollEnd: stopInteraction,
      onContentSizeChange: () => { if (following.current) ref.current?.scrollToEnd({ animated: false }); },
    },
  };
}
