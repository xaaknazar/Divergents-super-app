import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ReadingRules } from '../ReadingRules';
import { ReadingFlagRecovery } from '../ReadingFlagRecovery';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture } from '../../storybook/readingFixtures';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));

const recovery = { requiredDays: 5, progressDays: 1, daysRemaining: 4, earnedFlags: 3, forgivenFlags: 0 };
const props = (eliminatedOn: number | null, extra: Partial<ReadingChallengeContentProps['data']> = {}): ReadingChallengeContentProps => ({
  data: { ...individualReadingFixture, supportsLeave: true, participationId: '11111111-1111-4111-8111-111111111111', eliminationFlags: 5,
    me: { ...individualReadingFixture.me!, flags: eliminatedOn ? 5 : 3, eliminatedOn, firstDay: 2, flagRecovery: recovery }, ...extra },
  remainingMs: 3_600_000, timerState: 'ready', protection: 'ready', busy: false, awaitingPages: false, needsRecovery: false,
  book: { title: 'Книга', author: 'Автор', status: 'verified', verified: { title: 'Книга', author: 'Автор' }, suggestions: [],
    pick: jest.fn(), reject: jest.fn(), manual: jest.fn(), setTitle: jest.fn(), setAuthor: jest.fn(), check: jest.fn(), edit: jest.fn() },
  onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(), onSaveApproach: jest.fn(),
  onJoin: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onRanking: jest.fn(), onHistory: jest.fn(), onLeave: jest.fn(),
});
const show = (p: ReadingChallengeContentProps) => render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);

test('five red flags: no timer, «Вы выбыли» and a confirmed restart from zero', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const p = props(12);
  const v = await show(p);
  expect(v.queryByRole('timer')).toBeNull();
  expect(v.queryByRole('button', { name: 'Старт' })).toBeNull();
  expect(v.getByRole('header', { name: 'Вы выбыли из челленджа' })).toBeTruthy();
  expect(v.getByText(/5 красных флагов одновременно — на 11-й день участия/)).toBeTruthy();
  // The separate «Покинуть челлендж» is not shown twice.
  expect(v.queryByRole('button', { name: 'Покинуть челлендж' })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: 'Начать заново' }));
  expect(p.onLeave).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  expect(alert.mock.calls[0][0]).toBe('Начать заново?');
  buttons.find(b => b.text === 'Начать заново')!.onPress!();
  expect(p.onLeave).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});
test('a server without the rule keeps the old notice; without reset support there is no restart button', async () => {
  const legacy = await show(props(12, { eliminationFlags: undefined }));
  expect(legacy.getByText('Участие завершено на 12-й день.')).toBeTruthy();
  expect(legacy.queryByRole('header', { name: 'Вы выбыли из челленджа' })).toBeNull();
  const noReset = await show(props(12, { supportsLeave: false }));
  expect(noReset.getByRole('header', { name: 'Вы выбыли из челленджа' })).toBeTruthy();
  expect(noReset.queryByRole('button', { name: 'Начать заново' })).toBeNull();
});
test('an active reader sees how many flags remain before elimination', async () => {
  const v = await show(props(null));
  expect(v.getByRole('timer')).toBeTruthy();
  expect(v.getByText('Ещё 2 флага — и участие завершится. Вернуться можно будет только с нуля.')).toBeTruthy();
  const one = await render(<ThemePreviewProvider><ReadingFlagRecovery flags={1} recovery={recovery} eliminationFlags={5} /></ThemePreviewProvider>);
  expect(one.getByText('Ещё 4 флага — и участие завершится. Вернуться можно будет только с нуля.')).toBeTruthy();
  const none = await render(<ThemePreviewProvider><ReadingFlagRecovery flags={0} recovery={recovery} eliminationFlags={5} /></ThemePreviewProvider>);
  expect(none.queryByText(/участие завершится/)).toBeNull();
});
test('rules describe the five-flag exit and the restart from zero only when the server sends the limit', async () => {
  const v = await render(<ThemePreviewProvider><ReadingRules variant="list" flagRecoveryDays={5} eliminationFlags={5} /></ThemePreviewProvider>);
  await fireEvent.press(v.getByRole('button', { name: /Красные флаги и их снятие/ }));
  expect(v.getByText(/5 красных флагов одновременно — и участие завершается.*но с нуля/)).toBeTruthy();
  const old = await render(<ThemePreviewProvider><ReadingRules variant="list" flagRecoveryDays={5} /></ThemePreviewProvider>);
  await fireEvent.press(old.getByRole('button', { name: /Красные флаги и их снятие/ }));
  expect(old.queryByText(/участие завершается/)).toBeNull();
});
