import React from 'react';
import { View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingRankRow } from '../ReadingRankRow';
import { ThemePreviewProvider } from '../ThemePreviewProvider';

jest.mock('../SFIcon', () => ({ SF: () => null }));

type Props = React.ComponentProps<typeof ReadingRankRow>;
type Assert<T extends true> = T;
type PagesRequired = Assert<{} extends Pick<Props, 'pages'> ? false : true>;
type SemanticApi = Assert<Extract<keyof Props, 'style' | 'className' | 'color' | 'fontSize' | 'padding'> extends never ? true : false>;
const entry = { place: 2, name: 'Аружан', readingDays: 12, flags: 1, pace: 36.5, pages: 438 };

test('defaults to average pace while keeping the saved page total explicitly visible', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRankRow {...entry} /></ThemePreviewProvider>);
  expect(v.getByText('36,5 стр/день')).toHaveStyle({ textAlign: 'right' });
  expect(v.getByText('Всего прочитано: 438 стр.')).toBeTruthy();
  expect(v.getByLabelText(/всего прочитано 438 страниц.*средний темп 36,5 стр\/день/)).toBeTruthy();
  expect(v.queryByRole('button')).toBeNull();
});

test('the pages metric changes only visual emphasis and retains the same pace and reading history action', async () => {
  const onPress = jest.fn();
  const v = await render(<ThemePreviewProvider><ReadingRankRow {...entry} metric="pages" isMe onPress={onPress} /></ThemePreviewProvider>);
  expect(v.getByText('438 страниц всего')).toHaveStyle({ textAlign: 'right' });
  expect(v.getByText('Средний темп: 36,5 стр/день')).toBeTruthy();
  const row = v.getByRole('button', { name: /2 место.*Аружан.*это вы.*12 дней чтения.*красных флагов: 1.*438 страниц.*36,5 стр\/день/ });
  expect(row.props.accessibilityHint).toBe('Открыть книги и историю');
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test.each(['pace', 'pages'] as const)('zero results are visible in the %s mode, not hidden or replaced with a placeholder', async metric => {
  const v = await render(<ThemePreviewProvider><ReadingRankRow {...entry} pace={0} pages={0} readingDays={0} flags={0} metric={metric} /></ThemePreviewProvider>);
  expect(v.getByText(metric === 'pace' ? '0 стр/день' : '0 страниц всего')).toBeTruthy();
  expect(v.getByText(metric === 'pace' ? 'Всего прочитано: 0 стр.' : 'Средний темп: 0 стр/день')).toBeTruthy();
});

test.each(['pace', 'pages'] as const)('large text and large numbers retain full content without truncation rules in the compact %s layout', async metric => {
  for (const scheme of ['light', 'dark'] as const) {
    const v = await render(<ThemePreviewProvider scheme={scheme} textSize="xl"><View style={{ width: 320 }}>
      <ReadingRankRow {...entry} name="Константин Константинопольский" pace={123456.5} pages={123456789} metric={metric} isMe />
    </View></ThemePreviewProvider>);
    const name = v.getByText('Константин Константинопольский');
    const primary = v.getByText(metric === 'pace' ? '123 456,5 стр/день' : '123 456 789 страниц всего');
    const secondary = v.getByText(metric === 'pace' ? 'Всего прочитано: 123 456 789 стр.' : 'Средний темп: 123 456,5 стр/день');
    for (const text of [name, primary, secondary]) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).not.toBe(true);
      expect(text.props.allowFontScaling).not.toBe(false);
    }
    expect(JSON.stringify(v.toJSON())).not.toMatch(/[\u00a0\u202f]/);
    await v.unmount();
  }
});
