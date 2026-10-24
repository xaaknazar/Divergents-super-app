import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReadingChallengeContent, ReadingChallengeContentProps, ReadingBookInput } from '../ReadingChallengeContent';
import { ReadingTimer } from '../ReadingTimer';
import { ReadingChallengeCard } from '../ReadingChallengeCard';
import { ReadingRules } from '../ReadingRules';
import { READING_CHALLENGE_RULES } from '../../data/reading';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { individualReadingFixture, readingFixture } from '../../storybook/readingFixtures';
jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const book = (over: Partial<ReadingBookInput> = {}): ReadingBookInput => ({ title: 'Атомные привычки', author: 'Джеймс Клир', status: 'verified',
  verified: { title: 'Атомные привычки', author: 'Джеймс Клир', key: 'ol:OL1W' }, suggestions: [], pick: jest.fn(), reject: jest.fn(), manual: jest.fn(), setTitle: jest.fn(), setAuthor: jest.fn(), check: jest.fn(), edit: jest.fn(), ...over });
const session = { id: 's1', deviceId: 'd1', day: 14, book: 'Атомные привычки', author: 'Джеймс Клир', budgetMs: 36_000_000,
  startedAt: '2026-10-20T08:00:00Z', elapsedMs: 18 * 60000, status: 'running' as const };
const withToday = (elapsedMs: number, state: 'open' | 'complete' | 'review' = 'open') =>
  ({ ...individualReadingFixture, me: { ...individualReadingFixture.me!, history: [{ day: 14, state, pages: 12, elapsedMs }] } });
const props = (): ReadingChallengeContentProps => ({ data: { ...individualReadingFixture, session }, remainingMs: 2400000, timerState: 'running', protection: 'ready', busy: false,
  awaitingPages: false, needsRecovery: false, book: book(), onPrepare: jest.fn(), onStart: jest.fn(), onPause: jest.fn(), onReport: jest.fn(),
  onSaveApproach: jest.fn(), onJoin: jest.fn(), onRetry: jest.fn(), onRecover: jest.fn(), onRanking: jest.fn(), onHistory: jest.fn() });
const show = (p: ReadingChallengeContentProps) => render(<ThemePreviewProvider><ReadingChallengeContent {...p} /></ThemePreviewProvider>);

test('catalog card: an open challenge invites to join, a dated running one only shows the ranking', async () => {
  const onPress = jest.fn();
  const view = await render(<ThemePreviewProvider><ReadingChallengeCard challenge={{ ...readingFixture, mode: 'continuous', membership: null }} onPress={onPress} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: /Присоединиться/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><ReadingChallengeCard challenge={{ ...readingFixture, membership: null }} onPress={onPress} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: /Смотреть рейтинг/ })).toBeTruthy();
  expect(view.queryByText(/команд/i)).toBeNull();
});
test('joining needs the rules checkbox and joins immediately, without teams or applications', async () => {
  const p = { ...props(), data: { ...individualReadingFixture, membership: null, me: null } };
  const view = await show(p);
  expect(view.getByText(/60 минут в день · 5 участников/)).toBeTruthy();
  for (const rule of READING_CHALLENGE_RULES) expect(view.getByText(rule.title)).toBeTruthy();
  const join = view.getByRole('button', { name: 'Присоединиться' });
  expect(join).toBeDisabled();
  await fireEvent.press(join);
  expect(p.onJoin).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('checkbox', { name: 'Я ознакомился(-ась) с правилами челленджа' }));
  await fireEvent.press(view.getByRole('button', { name: 'Присоединиться' }));
  expect(p.onJoin).toHaveBeenCalledWith();
  expect(view.queryByText(/Команд|капитан|Заявк/)).toBeNull();
  expect(view.queryByRole('button', { name: 'Пауза' })).toBeNull();
});
test('a finished challenge cannot be joined', async () => {
  const view = await show({ ...props(), data: { ...individualReadingFixture, phase: 'finished', membership: null, me: null } });
  expect(view.queryByRole('button', { name: 'Присоединиться' })).toBeNull();
  expect(view.getByText(/вступить уже нельзя/)).toBeTruthy();
});
test('participant page: rank link opens the ranking; no challenge block, teams or tabs', async () => {
  const p = props();
  const view = await show(p);
  await fireEvent.press(view.getByRole('button', { name: 'Мой рейтинг. По среднему темпу: 4 место из 5 участников. По страницам: 4 место из 5 участников' }));
  expect(p.onRanking).toHaveBeenCalledTimes(1);
  expect(view.queryByText(individualReadingFixture.title)).toBeNull();
  expect(view.queryByText(/Команды|Участники/)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Мои книги и история' }));
  expect(p.onHistory).toHaveBeenCalledWith('demo-reader');
});
test('legacy qualification flags cannot hide a participant’s place', async () => {
  const p = props();
  p.data = { ...p.data, ranking: p.data.ranking.map(m => m.userId === 'demo-reader' ? { ...m, rankingEligible: false, qualificationDaysLeft: 4 } : m) };
  const view = await show(p);
  expect(view.getByRole('button', { name: 'Мой рейтинг. По среднему темпу: 4 место из 5 участников. По страницам: 4 место из 5 участников' })).toBeTruthy();
  expect(view.queryByText(/До участия в рейтинге/)).toBeNull();
});
test('today shows the red-flag warning until the hour is done', async () => {
  const p = { ...props(), timerState: 'ready' as const, data: withToday(18 * 60000) };
  const view = await show(p);
  expect(view.getByText('Ещё 42 мин до 00:00, иначе красный флаг')).toBeTruthy();
  expect(view.getByText('22,3 стр/день')).toBeTruthy();
  expect(view.getByText('средний темп')).toBeTruthy();
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} data={withToday(61 * 60000, 'complete')} timerState="complete" /></ThemePreviewProvider>);
  expect(view.getByText('Час выполнен — сегодня без флага')).toBeTruthy();
});
test('a foreign session cannot show or pause someone else’s timer', async () => {
  const p = { ...props(), sessionNotice: { kind: 'other-account' as const, message: 'Сеанс другого аккаунта сохранён отдельно.' }, startBlocked: true };
  const view = await show(p);
  expect(view.queryByRole('button', { name: 'Пауза' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Повторить' }));
  expect(p.onRetry).toHaveBeenCalledTimes(1);
});
test('collapsed rules expand in place: every rule opens its text', async () => {
  const view = await render(<ThemePreviewProvider><ReadingRules /></ThemePreviewProvider>);
  expect(view.queryByText(READING_CHALLENGE_RULES[0].title)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: `Правила челленджа, ${READING_CHALLENGE_RULES.length} пунктов` }));
  for (const rule of READING_CHALLENGE_RULES) expect(view.getByText(rule.title)).toBeTruthy();
  expect(view.queryByText(READING_CHALLENGE_RULES[6].text)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: `Пункт 7. ${READING_CHALLENGE_RULES[6].title}` }));
  expect(view.getByText(READING_CHALLENGE_RULES[6].text)).toBeTruthy();
});
test('while the timer runs there is only «Пауза», also in overtime', async () => {
  const p = props(); const view = await show(p);
  expect(view.queryByRole('button', { name: /Завершить/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Пауза' }));
  expect(p.onPause).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} remainingMs={-120000} /></ThemePreviewProvider>);
  expect(view.getByText('+02:00')).toBeTruthy();
  expect(view.queryByRole('button', { name: /Завершить/ })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Пауза' }));
  expect(p.onPause).toHaveBeenCalledTimes(2);
});
test('pause stays available during a pending request; the book of the running approach is locked', async () => {
  const p = { ...props(), blockingMode: 'all-apps' as const, busy: true, error: 'Ждём сервер' };
  const view = await show(p);
  const pause = view.getByRole('button', { name: 'Пауза' });
  expect(pause).toBeEnabled();
  await fireEvent.press(pause);
  expect(p.onPause).toHaveBeenCalledTimes(1);
  expect(view.queryByRole('button', { name: /Сменить книгу/ })).toBeNull();
  expect(view.getByText('Строгий режим · ограничения iOS')).toBeTruthy();
});
test.each([1, 2400000])('with %i ms remaining a soft pause permits resuming without forcing pages', async remainingMs => {
  const p = { ...props(), remainingMs, resumableSession: true, canResume: true, timerState: 'paused' as const, onResume: jest.fn() };
  const view = await show(p);
  expect(view.queryByLabelText('Страниц за этот подход')).toBeNull();
  expect(view.queryByRole('button', { name: 'Сохранить подход' })).toBeNull();
  expect(view.getByRole('button', { name: 'Записать страницы' })).toBeEnabled();
  await fireEvent.press(view.getByRole('button', { name: 'Возобновить' }));
  expect(p.onResume).toHaveBeenCalledTimes(1);
  expect(p.onSaveApproach).not.toHaveBeenCalled();
});
test('an explicit page action saves the current book before the daily goal without enabling a second book early', async () => {
  const p = { ...props(), remainingMs: 35 * 60000, resumableSession: true, canResume: true, timerState: 'paused' as const, onResume: jest.fn() };
  const view = await show(p);
  await fireEvent.press(view.getByRole('button', { name: 'Записать страницы' }));
  expect(view.getByRole('button', { name: 'Возобновить' })).toBeEnabled();
  expect(view.queryByRole('button', { name: /Сменить книгу/ })).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Страниц за этот подход'), '15');
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onSaveApproach).toHaveBeenCalledWith(15, undefined);
  expect(p.onReport).not.toHaveBeenCalled();
  expect(p.onStart).not.toHaveBeenCalled();
});
test.each([0, -60000])('after the daily goal (%i ms remaining): pages and resume are available', async remainingMs => {
  const p = { ...props(), remainingMs, resumableSession: true, canResume: true, timerState: 'paused' as const, onResume: jest.fn() };
  const view = await show(p);
  await fireEvent.press(view.getByRole('button', { name: 'Возобновить' }));
  expect(p.onResume).toHaveBeenCalledTimes(1);
  expect(view.getByText('Страницы за этот подход')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('Страниц за этот подход'), '22');
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onSaveApproach).toHaveBeenCalledWith(22, undefined);
  expect(p.onReport).not.toHaveBeenCalled();
  expect(p.onStart).not.toHaveBeenCalled();
});
test('an already closed approach reports its pages', async () => {
  const p = { ...props(), timerState: 'paused' as const, awaitingPages: true };
  const view = await show(p);
  expect(view.getByRole('button', { name: 'Сохранить подход' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'Меньше страниц' })).toBeDisabled();
  await fireEvent.press(view.getByRole('button', { name: 'Больше страниц' }));
  await fireEvent.press(view.getByRole('button', { name: 'Меньше страниц' }));
  await fireEvent.press(view.getByRole('button', { name: 'Сохранить подход' }));
  expect(p.onReport).toHaveBeenCalledWith(0, undefined);
});
test('«Старт» at 60:00 and «Новый подход» after a saved approach distinguish new reading from resume', async () => {
  const p = { ...props(), timerState: 'ready' as const, remainingMs: 3_600_000, data: withToday(0) };
  const view = await show(p);
  await fireEvent.press(view.getByRole('button', { name: 'Старт' }));
  expect(p.onStart).toHaveBeenCalledWith('Атомные привычки', { author: 'Джеймс Клир', bookKey: 'ol:OL1W', coverId: undefined });
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} data={withToday(18 * 60000)} remainingMs={42 * 60000} /></ThemePreviewProvider>);
  expect(view.queryByRole('button', { name: 'Старт' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Новый подход' }));
  expect(p.onStart).toHaveBeenCalledTimes(2);
});
test('«Старт» needs a confirmed book: AI proposes «Эта книга?», the reader picks or rejects', async () => {
  const b = book({ title: '', author: '', status: 'empty', verified: null });
  const p = { ...props(), timerState: 'ready' as const, remainingMs: 3_600_000, data: withToday(0), book: b };
  const view = await show(p);
  expect(view.getByRole('button', { name: 'Старт' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'Найти книгу' })).toBeDisabled();
  const typed = { ...b, title: 'атомные привычки' };
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={typed} /></ThemePreviewProvider>);
  expect(view.getByRole('button', { name: 'Старт' })).toBeDisabled();
  await fireEvent.press(view.getByRole('button', { name: 'Найти книгу' }));
  expect(b.check).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={{ ...typed, status: 'suggested',
    suggestions: [{ title: 'Атомные привычки', author: 'Джеймс Клир' }, { title: 'Атомные привычки. Рабочая тетрадь', author: 'Джеймс Клир' }] }} /></ThemePreviewProvider>);
  expect(view.getByText('Какая из этих книг?')).toBeTruthy();
  expect(view.getByText('Атомные привычки. Рабочая тетрадь')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Старт' })).toBeDisabled();
  await fireEvent.press(view.getAllByRole('button', { name: 'Да, эта' })[1]);
  expect(b.pick).toHaveBeenCalledWith(1);
  await fireEvent.press(view.getByRole('button', { name: 'Нет, другая книга' }));
  expect(b.reject).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={{ ...typed, status: 'notFound' }} /></ThemePreviewProvider>);
  expect(view.getByText(/Не нашли подходящую книгу/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Найти снова' }));
  expect(b.check).toHaveBeenCalledTimes(2);
});
test('if AI finds nothing, the reader writes title and author manually and can start', async () => {
  const b = book({ title: 'Моя редкая книга', author: '', status: 'notFound', verified: null });
  const p = { ...props(), timerState: 'ready' as const, remainingMs: 3_600_000, data: withToday(0), book: b };
  const view = await show(p);
  expect(view.getByRole('button', { name: 'Записать вручную' })).toBeDisabled();
  expect(view.getByText('Для записи вручную укажите название и автора.')).toBeTruthy();
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={{ ...b, author: 'Местный автор' }} /></ThemePreviewProvider>);
  await fireEvent.press(view.getByRole('button', { name: 'Записать вручную' }));
  expect(b.manual).toHaveBeenCalledTimes(1);
  const manual = { title: 'Моя редкая книга', author: 'Местный автор', manual: true };
  await view.rerender(<ThemePreviewProvider><ReadingChallengeContent {...p} book={{ ...b, author: 'Местный автор', status: 'verified', verified: manual }} /></ThemePreviewProvider>);
  expect(view.getByText('Указана вручную')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Старт' }));
  expect(p.onStart).toHaveBeenCalledWith('Моя редкая книга', { author: 'Местный автор', bookKey: undefined, coverId: undefined });
});
test('strict start explains full scope and requires explicit confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    const p = { ...props(), blockingMode: 'all-apps' as const, timerState: 'ready' as const, data: withToday(0) };
    const view = await show(p);
    await fireEvent.press(view.getByRole('button', { name: 'Старт' }));
    expect(p.onStart).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][1]).toContain('банки и карты');
    expect(alert.mock.calls[0][1]).toContain('разрешённые приложения');
    expect(alert.mock.calls[0][1]).toContain('даже без интернета');
    alert.mock.calls[0][2]?.find(button => button.text === 'Начать чтение')?.onPress?.();
    expect(p.onStart).toHaveBeenCalledWith('Атомные привычки', expect.any(Object));
  } finally { alert.mockRestore(); }
});
test('strict mode requests authorization without an application picker', async () => {
  const p = { ...props(), blockingMode: 'all-apps' as const, timerState: 'ready' as const, protection: 'permission' as const, data: withToday(0) };
  const view = await show(p);
  expect(view.queryByRole('button', { name: 'Выбрать приложения' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Разрешить блокировку' }));
  expect(p.onPrepare).toHaveBeenCalledTimes(1);
  expect(view.getByRole('button', { name: 'Старт' })).toBeDisabled();
});
test('overtime counts up and shows a completed ring instead of resetting the hour', async () => {
  const view = await render(<ThemePreviewProvider><ReadingTimer remainingMs={-925000} state="running" /></ThemePreviewProvider>);
  expect(view.getByText('+15:25')).toBeTruthy(); expect(view.getByText('Час выполнен')).toBeTruthy();
});
test.each(['paused', 'recording', 'saving'] as const)('%s keeps the frozen overtime value visible', async state => {
  const view = await render(<ThemePreviewProvider><ReadingTimer remainingMs={-925000} state={state} /></ThemePreviewProvider>);
  expect(view.getByText('+15:25')).toBeTruthy();
  expect(view.queryByText('00:00')).toBeNull();
});
test('a legacy review marker does not block a new approach or claim a confirmed save', async () => {
  const p = { ...props(), timerState: 'paused' as const, remainingMs: 1800000, data: { ...withToday(1800000, 'review'), session: null } };
  const view = await show(p);
  expect(view.getByRole('timer')).toBeTruthy();
  expect(view.queryByText(/на проверке|откроется завтра/)).toBeNull();
  expect(view.queryByText('Подход сохранён')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Новый подход' }));
  expect(p.onStart).toHaveBeenCalledTimes(1);
});
