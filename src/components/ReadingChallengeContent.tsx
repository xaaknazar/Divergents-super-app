import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { READING_REQUIRE_VERIFIED_BOOK, ReadingDetail, readingStandings } from '../data/reading';
import { ReadingBookMetadata } from '../data/readingBooks';
import { readingDateLabel } from '../data/readingCreation';
import { Button } from './Button';
import { Wrapper } from './Wrapper';
import { ScreenDescription } from './ScreenDescription';
import { InlineNotice } from './InlineNotice';
import { Checkbox } from './Checkbox';
import { ReadingChallengeHeader } from './ReadingChallengeHeader';
import { ReadingRules } from './ReadingRules';
import { ReadingRankLink } from './ReadingRankLink';
import { ReadingBookField, ReadingBookInput } from './ReadingBookField';
import { ReadingTimer } from './ReadingTimer';
import { ReadingTimerControls } from './ReadingTimerControls';
import { ReadingPagesForm } from './ReadingPagesForm';
import { ReadingSaveStatus } from './ReadingSaveStatus';
import { ReadingPagesNotice } from './ReadingPagesNotice';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingHistoryLink } from './ReadingHistoryLink';
import { ReadingBookLibrary, ReadingBookshelf, ReadingShelfComposer } from './ReadingBookshelf';
import { ReadingAllowedAppsCard, ReadingAllowedAppsView } from './ReadingAllowedAppsCard';
export type { ReadingBookInput } from './ReadingBookField';

const HOUR = 3_600_000;
export type ReadingChallengeContentProps = {
  data: ReadingDetail; remainingMs: number; timerState: 'ready' | 'running' | 'paused' | 'complete';
  protection: 'unavailable' | 'permission' | 'selection' | 'ready'; busy: boolean; error?: string; awaitingPages: boolean;
  blockingMode?: 'selected' | 'all-apps';
  resumableSession?: boolean; canResume?: boolean; onResume?: () => void;
  sessionElapsedMs?: number;
  onPrepare: () => void; onStart: (book: string, metadata?: ReadingBookMetadata) => void; onPause: () => void;
  /** Закрыть отдельный подход (в том числе до дневной цели) и отправить его страницы. */
  onSaveApproach: (pages: number, nextPage?: number) => void;
  /** Страницы уже закрытого подхода. */
  onReport: (pages: number, nextPage?: number) => void;
  book: ReadingBookInput;
  library?: ReadingBookLibrary;
  composer?: ReadingShelfComposer;
  allowedApps?: ReadingAllowedAppsView;
  onJoin: () => void; onRetry: () => void; onRanking: () => void; onHistory?: (userId: string) => void;
  sessionNotice?: { kind: 'test-running' | 'other-account' | 'other-challenge'; message: string }; startBlocked?: boolean;
  needsRecovery: boolean; onRecover: () => void;
};

/** Reading challenge, индивидуальный зачёт. Не участник — вступление: компактный блок, правила, галочка,
 * «Присоединиться». Несохранённые страницы — первым обязательным шагом. Затем таймер, «Что читаете»,
 * «Сегодня», «Мой рейтинг», «Мои книги и история», свёрнутые правила. */
export function ReadingChallengeContent(p: ReadingChallengeContentProps) {
  const d = p.data;
  const [agreed, setAgreed] = useState(false);
  const [pages, setPages] = useState('');
  const [pagesRequested, setPagesRequested] = useState(false);
  useEffect(() => { setPages(''); setPagesRequested(false); }, [d.id, d.me?.userId, d.session?.id]);
  useEffect(() => { if (p.timerState === 'running') setPagesRequested(false); }, [p.timerState]);
  const member = d.membership === 'approved' ? d.me : null;
  const participants = d.participants ?? d.ranking.length;
  const canJoin = !member && (d.phase === 'upcoming' || d.phase === 'active' && d.mode === 'continuous');

  if (!member) return <Wrapper padding={16} gap={18}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    <ReadingChallengeHeader variant="compact" title={d.title} phase={d.phase} day={d.currentDay} durationDays={d.durationDays}
      startDate={d.startDate} mode={d.mode} participants={participants} />
    <ReadingRules variant="list" blockingMode={p.blockingMode} />
    {canJoin ? <Wrapper gap={12}>
      <Checkbox label="Я ознакомился(-ась) с правилами челленджа" checked={agreed} onChange={setAgreed} disabled={p.busy} />
      <Button label="Присоединиться" size="large" onPress={p.onJoin} loading={p.busy} disabled={!agreed}
        accessibilityHint="Вы сразу станете участником. Ваш день 1 — сегодня" />
    </Wrapper> : <ScreenDescription text={d.phase === 'finished' ? 'Челлендж завершён — вступить уже нельзя.' : 'Набор в этот челлендж закрыт.'} />}
  </Wrapper>;

  const today = member.history.find(h => h.day === d.currentDay);
  const todayMs = today?.elapsedMs ?? 0;
  const reader = d.phase === 'active' && !member.eliminatedOn;
  const running = p.timerState === 'running';
  const awaitingPages = p.awaitingPages || d.session?.status === 'awaiting_pages';
  const softPaused = !!p.resumableSession && p.timerState === 'paused' && !awaitingPages;
  const recording = softPaused && (p.remainingMs <= 0 || pagesRequested) || awaitingPages;
  const standing = readingStandings(d.ranking).find(s => s.member.userId === member.userId);
  const pagesStanding = readingStandings(d.ranking, 'pages').find(s => s.member.userId === member.userId);
  const book = p.book;
  const bookReady = READING_REQUIRE_VERIFIED_BOOK ? !!book.verified : book.title.trim().length >= 2;
  const startBook = book.verified ?? { title: book.title.trim(), author: book.author.trim() };
  const previousBook = (d.todayBooks ?? []).find(saved => saved.key === book.verified?.key)
    ?? p.library?.books.find(saved => saved.key === book.verified?.key);
  const startConfirmed = () => p.onStart(startBook.title, { author: startBook.author || undefined, bookKey: book.verified?.key,
    coverId: book.verified?.coverId, ...(previousBook?.nextPage != null ? { fromPage: previousBook.nextPage } : {}) });
  const approachOpen = !!d.session || !!p.resumableSession || running || awaitingPages;
  const start = () => {
    if (p.blockingMode !== 'all-apps') { startConfirmed(); return; }
    Alert.alert('Начать чтение в строгом режиме?',
      'На время чтения iOS ограничит все доступные для блокировки приложения и сайты. Divergents и выбранные вами разрешённые приложения останутся доступны. Остальные читалки, игры, соцсети, банки и карты могут блокироваться.\n\nКнопка «Пауза» сразу снимет ограничения, даже без интернета.',
      [{ text: 'Отмена', style: 'cancel' }, { text: 'Начать чтение', onPress: startConfirmed }]);
  };
  const nextPage = d.session?.fromPage != null && pages ? d.session.fromPage + Number(pages) : undefined;
  const pagesInvalid = !/^\d+$/.test(pages) || Number(pages) > 10000 || (nextPage ?? 0) > 100000;
  const submitPages = () => (softPaused ? p.onSaveApproach : p.onReport)(Number(pages), nextPage);
  const sessionElapsedMs = p.sessionElapsedMs ?? d.session?.elapsedMs;
  const timerVisual = awaitingPages && p.busy ? 'saving' as const : recording ? 'recording' as const : p.timerState;
  const todayMinutes = Math.floor(todayMs / 60000);
  // A legacy cached review payload is not a save receipt. It never blocks reading,
  // but must not be presented as newly confirmed credit before server refresh.
  const savedToday = !recording && !running && todayMs > 0 && today?.state !== 'review';
  const idleAction = todayMs > 0 ? 'next' as const : 'start' as const;
  return <Wrapper padding={16} gap={18}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    {p.sessionNotice ? <InlineNotice message={p.sessionNotice.message} onRetry={p.onRetry} /> : null}
    {member.eliminatedOn ? <InlineNotice message={`Участие завершено на ${member.eliminatedOn}-й день.`} /> : null}
    {d.phase === 'upcoming' ? <ScreenDescription text={`Челлендж начнётся ${readingDateLabel(d.startDate)}. В этот день здесь появится таймер.`} /> : null}
    {recording && !p.sessionNotice ? <Wrapper gap={12}>
      <ReadingPagesNotice state="required" />
      {d.session && d.session.day !== d.currentDay ? <InlineNotice message="Это подход за прошлый день. Страницы запишутся в тот день, а не в сегодняшний." /> : null}
      <ReadingPagesForm value={pages} onChange={setPages} busy={p.busy} invalid={pagesInvalid} onSubmit={submitPages}
        bookTitle={d.session?.book}
        sessionMinutes={sessionElapsedMs != null ? Math.floor(sessionElapsedMs / 60000) : undefined}
        fromPage={d.session?.fromPage} nextPage={nextPage} />
    </Wrapper> : null}
    {reader && !p.sessionNotice ? <Wrapper gap={16}>
      <ReadingTimer remainingMs={p.remainingMs} state={timerVisual} blockingMode={p.blockingMode} extraMs={Math.max(0, todayMs - HOUR)} />
      {running && !awaitingPages ? <>
        <ReadingTimerControls action="pause" onPress={p.onPause} />
        {p.remainingMs <= 0 ? <ReadingPagesNotice state="goal" onRecord={p.onPause} busy={p.busy} /> : null}
      </>
        : recording ? softPaused && p.onResume ? <ReadingTimerControls action="resume" secondary disabled={!p.canResume || p.busy} onPress={p.onResume} /> : null
        : p.protection === 'unavailable' ? <InlineNotice message="Системная блокировка недоступна в этой сборке. Запустить защищённый сеанс пока нельзя." />
        : p.needsRecovery ? <InlineNotice message="На сервере есть начатый подход, но на этом телефоне нет подтверждённого времени. Если чтение шло на другом устройстве, откройте его там."
          actionLabel="Закрыть прерванный подход" onRetry={() => Alert.alert('Закрыть прерванный подход?', 'Неподтверждённое время не будет начислено. Уже сохранённые подходы останутся.', [
            { text: 'Отмена', style: 'cancel' }, { text: 'Закрыть подход', onPress: p.onRecover },
          ])} />
        : softPaused ? <>
          {p.onResume ? <ReadingTimerControls action="resume" disabled={!p.canResume || p.busy} onPress={p.onResume} /> : null}
          <Button label="Записать страницы" variant="tinted" disabled={p.busy} onPress={() => setPagesRequested(true)}
            accessibilityHint="Завершить этот подход и сохранить страницы текущей книги. Потом можно выбрать другую книгу" />
          <ScreenDescription text="Можно продолжить эту книгу или сохранить подход и выбрать другую. Все подходы складываются в общие 60 минут за день." />
        </>
        : <>
          {savedToday ? <ReadingSaveStatus state="saved" detail={`Сегодня: ${todayMinutes} мин · ${today?.pages ?? 0} стр. Подтверждено сервером.`} /> : null}
          {p.protection !== 'ready' ? <>
            <ScreenDescription text={p.blockingMode === 'all-apps'
              ? 'Разрешите Экранное время: во время чтения iOS ограничит приложения, кроме Divergents и выбранных вами исключений для чтения.'
              : 'Выберите соцсети и браузеры, которые будут недоступны во время чтения. Не выбирайте Divergents и приложение для книг.'} />
            <Button label={p.protection === 'permission' ? 'Разрешить блокировку' : 'Выбрать приложения'} variant="tinted" onPress={p.onPrepare} loading={p.busy} />
          </> : null}
          <ReadingTimerControls action={idleAction} onPress={start} loading={p.busy}
            disabled={p.startBlocked || approachOpen || p.protection !== 'ready' || !bookReady || !!p.allowedApps?.busy || !!p.composer?.adding} />
          {!bookReady ? <ScreenDescription text={p.library ? 'Добавьте книгу на полку и выберите её для подхода.' : READING_REQUIRE_VERIFIED_BOOK ? 'Чтобы начать, выберите и подтвердите книгу.' : 'Чтобы начать, напишите название книги.'} /> : null}
        </>}
      {d.session ? <ReadingBookField status="verified" locked title={d.session.book} author={d.session.author ?? ''}
        onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} />
        : !p.library || book.verified ? <ReadingBookField status={book.status} title={book.title} author={book.author} error={book.error} locked={p.busy || !!p.library}
          suggestions={book.suggestions} onPick={book.pick} onReject={book.reject} onManual={book.manual} manual={!!book.verified?.manual}
          onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} /> : null}
    </Wrapper> : null}
    {p.library ? <ReadingBookshelf key={`${d.id}:${member.userId}`} library={p.library} composer={p.composer}
      selectedKey={d.session?.bookKey ?? book.verified?.key} selectionLocked={approachOpen || !!p.sessionNotice || !reader}
      disabled={p.busy} /> : null}
    {p.allowedApps && d.phase !== 'finished' ? <ReadingAllowedAppsCard value={{ ...p.allowedApps,
      editable: p.allowedApps.editable && !approachOpen && !p.busy && !p.sessionNotice }} /> : null}
    {d.phase !== 'upcoming' ? <ReadingProgressSummary member={member} todayMs={d.phase === 'active' ? todayMs : undefined}
      books={d.phase === 'active' ? d.todayBooks : undefined} /> : null}
    <ReadingRankLink place={standing?.place ?? null} pagesPlace={pagesStanding?.place ?? null} participants={participants} onPress={p.onRanking} />
    {p.onHistory ? <ReadingHistoryLink onPress={() => p.onHistory?.(member.userId)} /> : null}
    <ReadingRules variant="collapsed" blockingMode={p.blockingMode} />
  </Wrapper>;
}
