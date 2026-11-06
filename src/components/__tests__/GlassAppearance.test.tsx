import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GlassSurface } from '../GlassSurface';
import { HeaderIcon } from '../HeaderIcon';
import { GlassGroup } from '../GlassButton';
import { TabDock } from '../TabDock';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({top:44,bottom:34,left:0,right:0}) }));

jest.mock('expo-glass-effect', () => ({
  GlassView: ({children, ...props}: any) => require('react').createElement(require('react-native').View, {testID:'native-glass', ...props}, children),
  isLiquidGlassAvailable: () => true, isGlassEffectAPIAvailable: () => true,
}));
jest.mock('../SFIcon', () => ({SF: ({name, color}: any) => require('react').createElement(require('react-native').Text, {testID: name, style:{color}}, name)}));
const shape = {height:48, width:48, borderRadius:24};
const preview = (child: React.ReactNode, scheme: 'light'|'dark', reduced = false) => <ThemePreviewProvider scheme={scheme} reduceTransparency={reduced}>{child}</ThemePreviewProvider>;

it.each(['light','dark'] as const)('pins native glass to the app appearance in %s, never system auto', async scheme => {
  const view = await render(preview(<GlassSurface style={shape} />, scheme));
  expect(view.getByTestId('native-glass').props.colorScheme).toBe(scheme);
});
it.each(['light','dark'] as const)('keeps the notification and prominent action white in %s', async scheme => {
  const view = await render(preview(<><HeaderIcon name="bell.fill" label="Уведомления" onPress={jest.fn()} /><HeaderIcon name="checkmark" label="Готово" variant="primary" onPress={jest.fn()} /></>,scheme));
  for(const name of ['bell.fill','checkmark']) expect(StyleSheet.flatten(view.getByTestId(name).props.style).color).toBe('#FFFFFF');
});
it('preserves disabled semantics and dimming on a coloured header', async () => {
  const view = await render(<ThemePreviewProvider scheme="light" background="accent"><HeaderIcon name="bell.fill" label="Уведомления" onWash /></ThemePreviewProvider>);
  expect(view.getByRole('button',{name:'Уведомления'}).props.accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(view.getByTestId('bell.fill').props.style).color).toBe('rgba(255,255,255,0.45)');
});
it.each(['light','dark'] as const)('uses an opaque control with white icons under Reduce Transparency in %s', async scheme => {
  const view = await render(preview(<HeaderIcon name="bell.fill" label="Уведомления" onPress={jest.fn()} />,scheme,true));
  expect(view.queryByTestId('native-glass')).toBeNull();
  expect(StyleSheet.flatten(view.getByTestId('bell.fill').props.style).color).toBe('#FFFFFF');
  expect(JSON.stringify(view.toJSON())).not.toContain('rgba(35,64,136');
  expect(JSON.stringify(view.toJSON())).toContain('#353A46');
});
it('keeps group action icons white in the light appearance', async () => {
  const view = await render(preview(<GlassGroup items={[{icon:'square.and.arrow.up',label:'Поделиться',onPress:jest.fn()}]} />, 'light'));
  expect(StyleSheet.flatten(view.getByTestId('square.and.arrow.up').props.style).color).toBe('#FFFFFF');
});
it.each(['light','dark'] as const)('pins the tab material to %s with the appropriate adaptive material', async scheme => {
  const view = await render(preview(<TabDock items={[{id:'home',label:'Обучение',icon:'book.fill',selected:true}]} onSelect={jest.fn()} />,scheme));
  const glass=view.getByTestId('tab-dock-glass',{includeHiddenElements:true});
  expect(glass.props.colorScheme).toBe(scheme);
  expect(glass.props.glassEffectStyle).toBe(scheme === 'dark' ? 'regular' : 'clear');
});


it.each(['light','dark'] as const)('navigation glass samples the backdrop without an opaque fill in %s', async scheme => {
  const view = await render(preview(<HeaderIcon name="bell.fill" label="Уведомления" onPress={jest.fn()} />,scheme));
  const glass = view.getByTestId('native-glass');
  if (scheme === 'light') expect(glass.props.tintColor).toBeUndefined();
  expect(glass.props.glassEffectStyle).toBe(scheme === 'dark' ? 'regular' : 'clear');
  expect(StyleSheet.flatten(glass.props.style).backgroundColor).toBeUndefined();
});
