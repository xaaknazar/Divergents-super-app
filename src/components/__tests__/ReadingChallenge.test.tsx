import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps } from '../ReadingChallengeContent';
import { ReadingTimer } from '../ReadingTimer';
import { ReadingChallengeCard } from '../ReadingChallengeCard';
import { ReadingProgressSummary } from '../ReadingProgressSummary';
import { ReadingRules } from '../ReadingRules';
import { READING_RULES } from '../../data/reading';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { readingFixture } from '../../storybook/readingFixtures';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const props = (): ReadingChallengeContentProps => ({ data: readingFixture, remainingMs: 2400000, timerState: 'running', protection: 'ready', busy: false,
  awaitingPages: false, needsRecovery: false, onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(),
  onJoin: jest.fn(), onApplications: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onResolve: jest.fn() });
test('catalog card opens the same challenge and distinguishes spectators', async () => {
  const onPress = jest.fn();
  const view = await render(<ThemePreviewProvider><ReadingChallengeCard challenge={{ ...readingFixture, membership: null }} onPress={onPress} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: /Смотреть рейтинг/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(view.queryByText('Вы участвуете')).toBeNull();
});
test('recruitment still submits selected team and roster stays filtered', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const p = props();
  p.data = { ...readingFixture, phase: 'upcoming', membership: null, me: null,
    ranking: [...readingFixture.ranking, { ...readingFixture.ranking[0], userId: 'other', teamId: 'other-team', name: 'Другой участник' }] };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Подать заявку' }));
  expect(p.onJoin).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][1]).toContain('Капитан другой команды не увидит');
  alert.mock.calls[0][2]?.find(button => button.text === 'Отправить заявку')?.onPress?.();
  expect(p.onJoin).toHaveBeenCalledWith('demo-team');
  alert.mockRestore();
  await fireEvent.press(view.getByRole('button', { name: 'Состав команды' }));
  expect(view.getByText('Читатель')).toBeTruthy();
  expect(view.queryByText('Другой участник')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Показать всех участников' }));
  expect(view.getByText('Другой участник')).toBeTruthy();
});
test('before start only recruitment is shown, without timer, private history or inline applications', async () => {
  const p = { ...props(), data: { ...readingFixture, phase: 'upcoming' as const, applications: [{ id: 'applicant', teamId: 'demo-team', name: 'Тестовая заявка' }] }, onHistory: jest.fn() };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.queryByText('Ваш прогресс')).toBeNull();
  expect(view.queryByRole('button', { name: 'Мои книги и история' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Пауза и запись страниц' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Принять' })).toBeNull();
  expect(view.queryByText('Тестовая заявка')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Заявки команды · 1' }));
  expect(p.onApplications).toHaveBeenCalledTimes(1);
});
test('a foreign session permits team navigation but cannot show or pause someone else’s timer', async () => {
  const p = { ...props(), sessionNotice: { kind: 'other-account' as const, message: 'Сеанс другого аккаунта сохранён отдельно.' }, startBlocked: true };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.queryByRole('button', { name: 'Пауза и запись страниц' })).toBeNull();
  expect(view.getByRole('button', { name: 'Состав команды' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(p.onRetry).toHaveBeenCalledTimes(1);
});
test('a finished continuous challenge does not accept new applications', async () => {
  const p = { ...props(), data: { ...readingFixture, phase: 'finished' as const, mode: 'continuous' as const, membership: null, me: null }, timerState: 'ready' as const };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.queryByRole('button', { name: 'Подать заявку' })).toBeNull();
});
test('history disclosure keeps every recorded day available', async () => {
  const member = { ...readingFixture.me!, history: Array.from({ length: 5 }, (_, i) => ({ day: i + 1, state: 'complete' as const, elapsedMs: 3600000, pages: 20 })) };
  const view = await render(<ThemePreviewProvider><ReadingProgressSummary member={member} /></ThemePreviewProvider>);
  expect(view.queryByText('День 1')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Все дни (5)' }));
  expect(view.getByText('День 1')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Свернуть историю' }));
  expect(view.queryByText('День 1')).toBeNull();
});
test('rules disclosure exposes all rules unchanged', async () => {
  const view = await render(<ThemePreviewProvider><ReadingRules /></ThemePreviewProvider>);
  expect(view.queryByText(READING_RULES[0])).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Правила и защита' }));
  for (const rule of READING_RULES) expect(view.getByText(rule)).toBeTruthy();
});
test('mandatory hour only offers pause; overtime also offers finish', async () => {
  const p = props(); const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.queryByRole('button', { name: 'Завершить чтение' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Пауза и запись страниц' }));
  expect(p.onPause).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} remainingMs={-120000} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Завершить чтение' }));
  expect(p.onPause).toHaveBeenCalledTimes(2);
});
test('overtime counts up and shows a completed ring instead of resetting the hour', async () => {
  const view = await render(<ThemePreviewProvider><ReadingTimer remainingMs={-925000} state="running" /></ThemePreviewProvider>);
  expect(view.getByText('+15:25')).toBeTruthy(); expect(view.getByText('Час выполнен')).toBeTruthy();
});
test('paused report requires an explicit page number and submits only that number', async () => {
  const p = { ...props(), timerState: 'paused' as const, awaitingPages: true };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: 'Сохранить подход' })).toBeDisabled();
  await fireEvent.changeText(view.getByLabelText('Страниц за этот подход'), '22');
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(22);
});
test('pages stepper starts from an explicit zero and never goes negative', async () => {
  const p = { ...props(), timerState: 'paused' as const, awaitingPages: true };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: 'Сохранить подход' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'Меньше страниц' })).toBeDisabled();
  await fireEvent.press(view.getByRole('button', { name: 'Больше страниц' }));
  await fireEvent.press(view.getByRole('button', { name: 'Меньше страниц' }));
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(0);
});
test('team card shows the captain only when the name is known from the challenge data', async () => {
  const p = props();
  p.data = { ...readingFixture, phase: 'upcoming', membership: null, me: null,
    ranking: [...readingFixture.ranking, { ...readingFixture.ranking[0], userId: 'demo-captain', name: 'Аружан' }] };
  const view = await render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);
  expect(view.getByText(/Капитан Аружан · 8 мест свободно/)).toBeTruthy();
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} data={{ ...p.data, ranking: readingFixture.ranking }} /></ThemePreviewProvider>);
  expect(view.queryByText(/Капитан \S+ · /)).toBeNull();
  expect(view.getByText("8 мест свободно")).toBeTruthy();
});
