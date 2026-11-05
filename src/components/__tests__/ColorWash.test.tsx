import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ColorWash, WashSurface } from '../ColorWash';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('expo-blur', () => ({ BlurView: () => null }));

describe('ColorWash', () => {
  it('follows the personalization background and hides for «Без фона»', async () => {
    const on = await render(<ThemePreviewProvider background="accent"><ColorWash /></ThemePreviewProvider>);
    expect(on.queryByTestId('color-wash')).toBeTruthy();
    const off = await render(<ThemePreviewProvider background="none"><ColorWash /></ThemePreviewProvider>);
    expect(off.queryByTestId('color-wash')).toBeNull();
  });

  it('cards turn frosted over the wash and solid when transparency is reduced', async () => {
    const card = (rt: boolean) => <ThemePreviewProvider background="ocean" reduceTransparency={rt}>
      <WashSurface testID="s" radius={26}><Text>x</Text></WashSurface>
    </ThemePreviewProvider>;
    const frosted = await render(card(false));
    expect(StyleSheet.flatten(frosted.getByTestId('s').props.style).backgroundColor).toBe('transparent');
    const solid = await render(card(true));
    expect(StyleSheet.flatten(solid.getByTestId('s').props.style).backgroundColor).not.toBe('transparent');
  });
});
