import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { demoBook, demoProgram, demoProgramStats, demoResults } from '../../storybook/livenFixtures';
import { resolveThemePalette } from '../../theme/ThemeContext';
import { ACCENTS, contrastForeground, hexToRgba } from '../../theme/personalization';
import { darkTheme, lightTheme } from '../../theme/tokens';
import { BookCard } from '../BookCard';
import { ChallengeResultsContent } from '../ChallengeResultsContent';
import { FieldTrigger } from '../FieldTrigger';
import { MilestoneIllustration } from '../MilestoneIllustration';
import { ProgramResultHero } from '../ProgramResultHero';
import { ProgressRing } from '../ProgressRing';
import { SectionTabs } from '../SectionTabs';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn(), hSuccess: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));

type Assert<T extends true> = T;
type Sealed<C extends React.ComponentType<any>> = Extract<keyof React.ComponentProps<C>, 'style' | 'className' | 'color' | 'padding' | 'backgroundColor' | 'borderRadius'> extends never ? true : false;
type BookAPI = Assert<Sealed<typeof BookCard>>;
type FieldAPI = Assert<Sealed<typeof FieldTrigger>>;
type IllustrationAPI = Assert<Sealed<typeof MilestoneIllustration>>;
type ResultsAPI = Assert<Sealed<typeof ChallengeResultsContent>>;
const theme = (children: React.ReactNode, scheme: 'light' | 'dark' = 'light') => <ThemePreviewProvider scheme={scheme}>{children}</ThemePreviewProvider>;

it.each(['light', 'dark'] as const)('preserves every colour and personalisation formula in %s', scheme => {
  const base = scheme === 'dark' ? darkTheme : lightTheme;
  for (const accent of ACCENTS) {
    const ac = scheme === 'dark' ? accent.dark : accent.light;
    expect(resolveThemePalette(scheme, accent.key)).toEqual({ ...base,
      brand: ac.brand, brandAccent: ac.accent, brandText: scheme === 'dark' ? ac.accent : ac.brand,
      onBrand: contrastForeground(ac.brand), brandTinted: hexToRgba(ac.accent, scheme === 'dark' ? 0.18 : 0.13),
      brandTintedStrong: hexToRgba(ac.accent, scheme === 'dark' ? 0.28 : 0.20) });
  }
  expect(resolveThemePalette(scheme).brand).toBe(scheme === 'dark' ? '#3D5BDB' : '#234088');
});
it('keeps section selection and externally driven navigation', async () => {
  const onChange = jest.fn();
  const items = [{ id: 0, label: 'Лента' }, { id: 2, label: 'Челленджи' }];
  const view = await render(theme(<SectionTabs items={items} value={0} onChange={onChange} />));
  await fireEvent.press(view.getByRole('tab', { name: 'Челленджи' }));
  expect(onChange).toHaveBeenCalledWith(2);
  await view.rerender(theme(<SectionTabs items={items} value={2} onChange={onChange} />));
  expect(view.getByRole('tab', { name: 'Челленджи' }).props.accessibilityState.selected).toBe(true);
});
it('bounds ring geometry without inventing a completed-day streak', async () => {
  const view = await render(theme(<ProgressRing value={3} label="День 21" accessibilityLabel="День челленджа" />));
  expect(view.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 100, text: 'День 21' });
  await view.rerender(theme(<ProgressRing value={NaN} label="Нет данных" accessibilityLabel="День челленджа" />));
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
});
it('shows the final static artwork with reduced motion and ignores visual overrides', async () => {
  const rogue = { style: { opacity: 0 }, color: 'red' };
  const view = await render(theme(<MilestoneIllustration {...rogue} kind="trophy" size="celebration" entrance />));
  expect(StyleSheet.flatten(view.getByTestId('illustration-trophy', { includeHiddenElements: true }).props.style)).toMatchObject({ width: 176, height: 176, opacity: 1 });
});
it('retains exact program totals in the restored classic hero, without Liven artwork', async () => {
  const view = await render(theme(<ProgramResultHero program={demoProgram} stats={demoProgramStats} />));
  expect(view.getByTestId('program-total').props.children).toBe('335');
  expect(view.queryByTestId('illustration-trophy', { includeHiddenElements: true })).toBeNull();
  await view.rerender(theme(<ProgramResultHero program={demoProgram} stats={{ ...demoProgramStats, total: 0 }} />));
  expect(view.getByTestId('program-total').props.children).toBe('0');
  expect(view.queryByTestId('illustration-trophy', { includeHiddenElements: true })).toBeNull();
});
it('keeps editorial and reader ratings distinct and opens the same book', async () => {
  const onPress = jest.fn();
  const view = await render(theme(<BookCard book={demoBook} onPress={onPress} />));
  expect(view.getByLabelText('Оценка Divergents 4.5')).toBeTruthy();
  expect(view.getByLabelText('Оценка читателей 4.2, оценок: 8')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: /Демо · Новая привычка/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
it('awards only after confirmation, preventing a second press while pending', async () => {
  let confirm!: (ok: boolean) => void;
  const onClaimAward = jest.fn(() => new Promise<boolean>(resolve => { confirm = resolve; }));
  const onClaimed = jest.fn();
  const view = await render(theme(<ChallengeResultsContent data={demoResults} onClaimAward={onClaimAward} onClaimed={onClaimed} />));
  await fireEvent.press(view.getByRole('button', { name: 'Получить награду' }));
  expect(onClaimed).not.toHaveBeenCalled();
  expect(view.getByRole('button', { name: 'Получаем…' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(view.getByRole('button', { name: 'Получаем…' }));
  expect(onClaimAward).toHaveBeenCalledTimes(1);
  await act(async () => { confirm(true); });
  expect(view.getByText('Награда у вас — она рядом с вашим ником')).toBeTruthy();
  expect(onClaimed).toHaveBeenCalledTimes(1);
});
it('does not turn a failed award response into a celebration', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = await render(theme(<ChallengeResultsContent data={demoResults} onClaimAward={async () => false} />));
  await fireEvent.press(view.getByRole('button', { name: 'Получить награду' }));
  expect(view.queryByText('Награда у вас — она рядом с вашим ником')).toBeNull();
  expect(view.getByRole('button', { name: 'Получить награду' }).props.accessibilityState.disabled).toBe(false);
  expect(alert).toHaveBeenCalled();
  alert.mockRestore();
});
