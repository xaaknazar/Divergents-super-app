import { fireEvent,render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { lightTheme } from '../../theme/tokens';
import { ApplicationStatusBadge,applicationStatusLabel } from '../ApplicationStatusBadge';
import { Button,ButtonProps } from '../Button';
import { CareerComingSoon } from '../CareerComingSoon';
import { FieldValueRow } from '../FieldValueRow';
import { IconBadgeProps } from '../IconBadge';
import { ListRow } from '../ListRow';
import { ListSection } from '../ListSection';
import { ProgressBar,ProgressBarProps } from '../ProgressBar';
import { StatusBadgeProps } from '../StatusBadge';
import { Wrapper,WrapperProps } from '../Wrapper';

jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => {
  const tokens = jest.requireActual('../../theme/tokens');
  return { T: tokens.lightTheme, ty: tokens.ty };
} }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn() }));

type Assert<T extends true> = T;
type NoVisualOverrides<P> = Extract<keyof P, 'style' | 'className' | 'backgroundColor' | 'borderRadius' | 'color' | 'textColor'> extends never ? true : false;
type ButtonContract = Assert<NoVisualOverrides<ButtonProps>>;
type WrapperContract = Assert<NoVisualOverrides<WrapperProps>>;
type BadgeContract = Assert<NoVisualOverrides<StatusBadgeProps>>;
type ProgressContract = Assert<NoVisualOverrides<ProgressBarProps>>;
type SectionContract = Assert<NoVisualOverrides<React.ComponentProps<typeof ListSection>>>;
type RowContract = Assert<NoVisualOverrides<React.ComponentProps<typeof ListRow>>>;
type FieldContract = Assert<NoVisualOverrides<React.ComponentProps<typeof FieldValueRow>>>;
type IconContract = Assert<NoVisualOverrides<IconBadgeProps>>;

it.each([[NaN, 0], [-2, 0], [2, 100], [0.65, 65]])('bounds progress %s to %s', async (value, expected) => {
  const view = await render(<ProgressBar value={value} />);
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(expected);
});

it('keeps section spacing exclusively in its wrapper', async () => {
  const view = await render(<Wrapper marginTop={18} marginHorizontal={16} testID="section-layout">
    <ListSection header="Мои активности"><ListRow title="Книги" detail="12" /></ListSection>
  </Wrapper>);
  expect(StyleSheet.flatten(view.getByTestId('section-layout').props.style)).toMatchObject({ marginTop: 18, marginHorizontal: 16 });
  expect(view.getByText('Книги')).toBeTruthy();
});

it('does not forward cosmetics even from untyped callers', async () => {
  const rogue = { style: { backgroundColor: 'magenta', borderRadius: 0 }, color: 'magenta' };
  const view = await render(<Button {...rogue} label="Сохранить" testID="button" />);
  const styles = StyleSheet.flatten(view.getByTestId('button').props.style);
  expect(styles.backgroundColor).toBe(lightTheme.brand);
  expect(styles.borderRadius).not.toBe(0);
});

it('keeps layout outside a button and refuses wrapper cosmetics', async () => {
  const rogue = { style: { backgroundColor: 'magenta' }, backgroundColor: 'magenta' };
  const view = await render(<Wrapper {...rogue} dir="row" gap={12} flex={2} marginTop={24} testID="layout"><Button label="Далее" testID="button" /></Wrapper>);
  const layout = StyleSheet.flatten(view.getByTestId('layout').props.style);
  expect(layout).toMatchObject({ flexDirection: 'row', gap: 12, flex: 2, marginTop: 24 });
  expect(layout.backgroundColor).toBeUndefined();
  const button = StyleSheet.flatten(view.getByTestId('button').props.style);
  expect(button.marginTop).toBeUndefined();
  expect(button.flex).toBeUndefined();
});

it.each(['solid', 'tinted', 'outline', 'plain'] as const)('preserves action and disabled semantics for %s', async variant => {
  const onPress = jest.fn();
  const view = await render(<Button label="Принять" tone="success" variant={variant} onPress={onPress} />);
  await fireEvent.press(view.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
  await view.rerender(<Button label="Принять" variant={variant} disabled onPress={onPress} />);
  await fireEvent.press(view.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('keeps long labels untruncated and exposes busy state', async () => {
  const view = await render(<Button label="Сохранить анкету и продолжить регистрацию" loading />);
  expect(view.getByRole('button').props.accessibilityState).toEqual({ disabled: true, busy: true });
  expect(view.getByText('Сохранить анкету и продолжить регистрацию').props.numberOfLines).toBeUndefined();
});

it('keeps career availability content without inventing actions', async () => {
  const view = await render(<CareerComingSoon badge="Скоро" title="Раздел в разработке" description="Вакансии появятся в обновлении." />);
  expect(view.getByRole('header', { name: 'Раздел в разработке' })).toBeTruthy();
  expect(view.queryAllByRole('button')).toHaveLength(0);
});

it.each([
  ['pending', 'application', 'Новый'], ['approved', 'application', 'Принят'],
  ['rejected', 'application', 'Отклонён'], ['pending', 'event', 'Новая'],
  ['going', 'event', 'Идёт'], ['cancelled', 'event', 'Снялся'],
  ['pending', 'participation', 'На рассмотрении'], ['approved', 'participation', 'Участвую'],
  ['rejected', 'participation', 'Отклонена'], ['future', 'event', 'Новая'],
] as const)('keeps %s wording consistent in %s context', async (status, context, label) => {
  const view = await render(<ApplicationStatusBadge status={status} context={context} />);
  expect(view.getByText(label)).toBeTruthy();
  expect(applicationStatusLabel(status, context)).toBe(label);
});

it('preserves optional field visibility without a theme override prop', async () => {
  const view = await render(<FieldValueRow label="Город" value="" hideWhenEmpty />);
  expect(view.queryByText('Город')).toBeNull();
  await view.rerender(<FieldValueRow label="Город" value="" />);
  expect(view.getByText('Город')).toBeTruthy();
});
