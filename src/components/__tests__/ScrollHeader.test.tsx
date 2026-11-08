import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import { Screen } from '../Screen';
import { ScrollHeaderLayout, scrollHeaderContentInset } from '../ScrollHeaderLayout';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
const wrap = (children: React.ReactNode) => <ThemePreviewProvider>{children}</ThemePreviewProvider>;

it('keeps navigation outside the scroll content and updates clearance from actual header height', async () => {
  const v = await render(wrap(<Screen tabPadding={false} aurora={false} header={<Text>Назад</Text>}><Text>Рейтинг</Text></Screen>));
  const scroll = v.getByTestId('screen-fullscreen-scroll');
  expect(within(scroll).queryByText('Назад')).toBeNull();
  await fireEvent(v.getByTestId('scroll-header-measure'), 'layout', { nativeEvent: { layout: { height: 164 } } });
  expect(StyleSheet.flatten(v.getByTestId('screen-fullscreen-scroll').props.contentContainerStyle).paddingTop).toBe(164);
  expect(v.getByTestId('screen-fullscreen-scroll').props.scrollIndicatorInsets.top).toBe(164);
});

it('preserves a course cover beneath the status bar without adding a navigation spacer', async () => {
  const v = await render(wrap(<Screen headerOverCover header={<Text>Назад</Text>}><Text>Обложка</Text></Screen>));
  await fireEvent(v.getByTestId('scroll-header-measure'), 'layout', { nativeEvent: { layout: { height: 140 } } });
  expect(StyleSheet.flatten(v.getByTestId('screen-fullscreen-scroll').props.contentContainerStyle).paddingTop).toBe(0);
});

it('keeps native list padding and applies measured header clearance inside its viewport', async () => {
  const v = await render(wrap(<ScrollHeaderLayout header={<Text>Заявки</Text>}>{height =>
    <ScrollView testID="list" contentContainerStyle={scrollHeaderContentInset(height, { paddingVertical: 8, paddingBottom: 30 })}>
      <Text>Участник</Text>
    </ScrollView>
  }</ScrollHeaderLayout>));
  await fireEvent(v.getByTestId('scroll-header-measure'), 'layout', { nativeEvent: { layout: { height: 150 } } });
  const style = StyleSheet.flatten(v.getByTestId('list').props.contentContainerStyle);
  expect(style.paddingTop).toBe(158); expect(style.paddingBottom).toBe(30);
});
