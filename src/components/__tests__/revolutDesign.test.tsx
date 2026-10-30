import { fireEvent,render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet,Text } from 'react-native';
import { darkTheme,lightTheme,radius } from '../../theme/tokens';
import { ActionBlock,ActionBlockProps } from '../ActionBlock';
import { ChatComposer } from '../ChatComposer';
import { ContentBlock,ContentBlockProps } from '../ContentBlock';
import { ProfileSummary } from '../ProfileSummary';
import { TabDock,TabDockProps } from '../TabDock';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
type Assert<T extends true> = T;
type NoOverrides<P> = Extract<keyof P, 'style' | 'className' | 'backgroundColor' | 'borderRadius' | 'padding'> extends never ? true : false;
type ContentAPI = Assert<NoOverrides<ContentBlockProps>>;
type ActionAPI = Assert<NoOverrides<ActionBlockProps>>;
type DockAPI = Assert<NoOverrides<TabDockProps>>;
const theme = (children: React.ReactNode, scheme: 'light' | 'dark' = 'light') => <ThemePreviewProvider scheme={scheme}>{children}</ThemePreviewProvider>;

it.each(['light', 'dark'] as const)('owns the grouped surface in %s, including untyped callers', async scheme => {
  const rogue = { style: { backgroundColor: 'magenta' }, borderRadius: 0 };
  const view = await render(theme(<ContentBlock {...rogue}><Text>Блок</Text></ContentBlock>, scheme));
  const surfaces = view.container.queryAll(n => n.props.style !== undefined)
    .map(n => StyleSheet.flatten(n.props.style));
  expect(surfaces).toContainEqual(expect.objectContaining({ backgroundColor: scheme === 'dark' ? darkTheme.cardBg : lightTheme.cardBg, borderRadius: radius.block }));
  expect(surfaces.some(s => s.backgroundColor === 'magenta')).toBe(false);
});
it('preserves action and disabled semantics on a grouped block', async () => {
  const onPress = jest.fn();
  const view = await render(theme(<ActionBlock onPress={onPress} accessibilityLabel="Открыть"><Text>Карточка</Text></ActionBlock>));
  await fireEvent.press(view.getByRole('button', { name: 'Открыть' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await view.rerender(theme(<ActionBlock onPress={onPress} disabled accessibilityLabel="Открыть"><Text>Карточка</Text></ActionBlock>));
  await fireEvent.press(view.getByRole('button', { name: 'Открыть' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
it('keeps chat sending disabled for empty text and during a response', async () => {
  const onSend = jest.fn();
  const props = { value: '', onChangeText: jest.fn(), onSend, disabled: false, busy: false, placeholder: 'Сообщение' };
  const view = await render(theme(<ChatComposer {...props} />));
  await fireEvent.press(view.getByRole('button', { name: 'Отправить сообщение' }));
  expect(onSend).not.toHaveBeenCalled();
  await view.rerender(theme(<ChatComposer {...props} value="Привет" />));
  await fireEvent.press(view.getByRole('button', { name: 'Отправить сообщение' }));
  expect(onSend).toHaveBeenCalledTimes(1);
  await view.rerender(theme(<ChatComposer {...props} value="Привет" disabled busy />));
  expect(view.getByLabelText('Сообщение ассистенту').props.editable).toBe(false);
  await fireEvent.press(view.getByRole('button', { name: 'Отправить сообщение' }));
  expect(onSend).toHaveBeenCalledTimes(1);
});
it('keeps profile editing, progress and award visible with long names', async () => {
  const onEdit = jest.fn();
  const view = await render(theme(<ProfileSummary name="Очень длинное имя участника сообщества" completeness={75} award onEdit={onEdit} />));
  expect(view.getByText('Очень длинное имя участника сообщества').props.numberOfLines).toBeUndefined();
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(75);
  expect(view.getByLabelText('Награда за первое место в челлендже')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Редактировать анкету' }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});
it('announces full tab names and preserves selection and long press', async () => {
  const onSelect = jest.fn(), onLongPress = jest.fn();
  const view = await render(theme(<TabDock items={[
    { id: 'learn', label: 'Обучение', icon: 'book', selected: false },
    { id: 'community', label: 'Сообщество', icon: 'person.3', selected: true },
  ]} onSelect={onSelect} onLongPress={onLongPress} />));
  expect(view.getByRole('tab', { name: 'Сообщество' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getByRole('tab', { name: 'Обучение' }));
  await fireEvent(view.getByRole('tab', { name: 'Сообщество' }), 'longPress');
  expect(onSelect).toHaveBeenCalledWith('learn');
  expect(onLongPress).toHaveBeenCalledWith('community');
});
