import 'react-native-gesture-handler/jestSetup';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PanGesture, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { BookCoverViewer } from '../BookCoverViewer';
import { BookCoverPreview } from '../BookCoverPreview';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: any) => children, initialWindowMetrics: null, useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
const props = { source: 'https://example.com/cover.jpg', title: 'Книга', origin: { x: 100, y: 100, width: 120, height: 176 } };
const viewer = (onClose: () => void) => <ThemePreviewProvider reduceMotion><BookCoverViewer {...props} onClose={onClose} /></ThemePreviewProvider>;

it('supports the explicit close button and ignores double dismissal', async () => {
  const onClose = jest.fn(); const view = await render(viewer(onClose));
  await fireEvent.press(view.getByRole('button', { name: 'Закрыть обложку' }));
  await fireEvent.press(view.getByRole('button', { name: 'Закрыть обложку' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('supports Android system back', async () => {
  const onClose = jest.fn(); const view = await render(viewer(onClose));
  await fireEvent(view.getByTestId('book-cover-modal'), 'requestClose');
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('keeps a short drag open and dismisses a committed vertical swipe', async () => {
  const onClose = jest.fn(); await render(viewer(onClose));
  await act(() => fireGestureHandler<PanGesture>(getByGestureTestId('book-cover-dismiss'), [
    { state: State.BEGAN, translationY: 0 }, { state: State.ACTIVE, translationY: 25 },
    { state: State.END, translationY: 25, velocityY: 100 },
  ]));
  expect(onClose).not.toHaveBeenCalled();
  await act(() => fireGestureHandler<PanGesture>(getByGestureTestId('book-cover-dismiss'), [
    { state: State.BEGAN, translationY: 0 }, { state: State.ACTIVE, translationY: 150 },
    { state: State.END, translationY: 150, velocityY: 400 },
  ]));
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('does not present an empty cover action when no image exists', async () => {
  const view = await render(<ThemePreviewProvider><BookCoverPreview title="Без обложки" /></ThemePreviewProvider>);
  expect(view.queryByRole('button')).toBeNull();
});
