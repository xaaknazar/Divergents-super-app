import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlaceLocationPicker } from '../PlaceLocationPicker';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { findPlaceAddress } from '../../data/placeAddressSearch';

jest.mock('../../data/placeAddressSearch', () => ({ findPlaceAddress: jest.fn() }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../ui', () => {
  const React = require('react'); const { Pressable, Text } = require('react-native');
  return { Button: ({ label, onPress, disabled }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable> };
});
jest.mock('react-native-maps', () => {
  const React = require('react'); const { View } = require('react-native');
  return { __esModule: true, default: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() })); return <View {...props} />;
  }), Marker: (props: any) => <View {...props} /> };
});
const search = jest.mocked(findPlaceAddress);
const point = { latitude: 43.23, longitude: 76.88 };
async function setup() {
  const onChange = jest.fn();
  const view = await render(<ThemePreviewProvider scheme="light"><PlaceLocationPicker coordinate={point} city="Алматы" country="Казахстан" onChange={onChange} /></ThemePreviewProvider>);
  await fireEvent.changeText(view.getByLabelText('Улица и номер дома'), 'Розыбакиева 181А');
  await fireEvent.press(view.getByLabelText('Найти на карте'));
  return { ...view, onChange };
}
beforeEach(() => search.mockReset());
it('moves the submission pin after an explicit address search', async () => {
  const found = { latitude: 43.2, longitude: 76.9 };
  search.mockResolvedValue(found);
  const view = await setup();
  await waitFor(() => expect(view.onChange).toHaveBeenCalledWith(found));
  expect(search).toHaveBeenCalledWith('Розыбакиева 181А', 'Алматы', 'Казахстан');
});
it('does not overwrite a manually selected pin with a late search result', async () => {
  let resolve!: (value: typeof point) => void;
  search.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = await setup();
  const manual = { latitude: 43.25, longitude: 76.95 };
  await fireEvent(view.getByTestId('place-location-map'), 'press', { nativeEvent: { coordinate: manual } });
  await act(async () => resolve(point));
  expect(view.onChange).toHaveBeenCalledTimes(1);
  expect(view.onChange).toHaveBeenCalledWith(manual);
});
it('ignores search results when the typed address changes', async () => {
  let resolve!: (value: typeof point) => void;
  search.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = await setup();
  await fireEvent.changeText(view.getByLabelText('Улица и номер дома'), 'Другая улица 4');
  await act(async () => resolve(point));
  expect(view.onChange).not.toHaveBeenCalled();
});
it('keeps the original pin on a missing address and explains the manual alternative', async () => {
  search.mockResolvedValue(null);
  const view = await setup();
  await waitFor(() => expect(view.getByText('Адрес не найден. Уточните улицу и дом или поставьте точку на карте.')).toBeTruthy());
  expect(view.onChange).not.toHaveBeenCalled();
});
it('releases the search button after timeout and ignores its late response', async () => {
  jest.useFakeTimers();
  try {
    let resolve!: (value: typeof point) => void;
    search.mockReturnValue(new Promise(done => { resolve = done; }));
    const view = await setup();
    await act(() => jest.advanceTimersByTime(12000));
    expect(view.getByText('Поиск занял слишком много времени. Повторите или поставьте точку на карте.')).toBeTruthy();
    await act(async () => resolve(point));
    expect(view.onChange).not.toHaveBeenCalled();
    await view.unmount();
  } finally { jest.useRealTimers(); }
});
