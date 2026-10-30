import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { READING_REQUIRE_VERIFIED_BOOK, ReadingBookSummary, ReadingDetail, ReadingReportBook, readingStandings } from '../data/reading';
import { ReadingBookMetadata } from '../data/readingBooks';
import { readingDateLabel } from '../data/readingCreation';
import { readingDayDate } from '../data/readingOffline';
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
import { ReadingOfflineStatus } from './ReadingOfflineStatus';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingHistoryLink } from './ReadingHistoryLink';
import { ReadingBookLibrary, ReadingBookshelf, ReadingShelfComposer } from './ReadingBookshelf';
import { ReadingAllowedAppsCard, ReadingAllowedAppsView } from './ReadingAllowedAppsCard';
export type { ReadingBookInput } from './ReadingBookField';

const HOUR = 3_600_000;
export type ReadingChallengeContentProps = {
  data: ReadingDetail; remainingMs: number; timerState: 'ready' | 'running' | 'paused' | 'complete';
  protection: 'unavailable' | 'permission' | 'selection' | 'ready'; busy: boolean; error?: string; awaitingPages: boolean;
  /** Native transition/page save only. Background network refresh cannot disable local actions. */
  localBusy?: boolean;
  blockingMode?: 'selected' | 'all-apps';
  resumableSession?: boolean; canResume?: boolean; onResume?: () => void;
  sessionElapsedMs?: number;
  onPrepare: () => void; onStart: (book: string, metadata?: ReadingBookMetadata) => void; onPause: () => void;
  /** Закрыть отдельный подход (в том числе до дневной цели) и отправить его страницы.
   * `book` — другая книга, выбранная после остановки таймера (только если сервер это поддерживает). */
  onSaveApproach: (pages: number, nextPage?: number, book?: ReadingReportBook) => void;
  /** Страницы уже закрытого подхода. */
  onReport: (pages: number, nextPage?: number, book?: ReadingReportBook) => void;
  book: ReadingBookInput;
  library?: ReadingBookLibrary;
  composer?: ReadingShelfComposer;
  allowedApps?: ReadingAllowedAppsView;
  onJoin: () => void; onRetry: () => void; onRanking: () => void; onHistory?: (userId: string) => void;
  sessionNotice?: { kind: 'test-running' | 'other-account' | 'other-challenge' | 'other-device'; message: string }; startBlocked?: boolean;
  needsRecovery: boolean; onRecover: () => void;
  /** Сервер принял «Старт» этого телефона, но ответ потерялся: таймер ещё не идёт. */
  startRecovery?: boolean; onContinueStart?: () => void;
  /** Нет ответа сервера: экран работает по копии на телефоне. */
  offline?: boolean;
  /** Подходы, сохранённые на телефоне и ещё не принятые сервером (всего / за сегодня). */
  pendingApproaches?: number; pendingToday?: number;
  /** Подходы без интернета, которые сервер потом не принял. */
  rejectedApproaches?: { sessionId: string; book: string; elapsedMs?: number; pages?: number; message: string }[];
  onDismissRejected?: () => void;
  /** Время телефона для подсказки «до 00:00». Полночь «назад» оно не двигает: берётся не раньше serverNow. */
  nowMs?: number;
};

/** Reading challenge, индивидуальный зачёт. Не участник — вступление: компактный блок, правила, галочка,
 * «Присоединиться». Несохранённые страницы — первым обязательным шагом. Затем порядок iOS 97: таймер →
 * действие → «Что читаете» → «Сегодня» → «Мой рейтинг» → «Мои книги и история»; ниже настроенные
 * «Приложения для чтения» строкой и свёрнутые правила. */
export function ReadingChallengeContent(p: ReadingChallengeContentProps) {
  const d = p.data;
  const [agreed, setAgreed] = useState(false);
  // Ноль — допустимый результат подхода: форма сразу готова сохранить 0 страниц.
  const [pages, setPages] = useState('0');
  const [pagesRequested, setPagesRequested] = useState(false);
  // Снимок выбора: фоновое обновление полки не должно менять книгу или закладку уже заполненной формы.
  const reportScope = JSON.stringify([d.id, d.me?.userId, d.session?.id]);
  const [reportSelection, setReportSelection] = useState<{ scope: string; book: ReadingBookSummary }>();
  useEffect(() => { setPages('0'); setPagesRequested(false); setReportSelection(undefined); }, [reportScope]);
  useEffect(() => { if (p.timerState === 'running') setPagesRequested(false); }, [p.timerState]);
  const member = d.membership === 'approved' ? d.me : null;
  const participants = d.participants ?? d.ranking.length;
  const canJoin = !member && (d.phase === 'upcoming' || d.phase === 'active' && d.mode === 'continuous');

  if (!member) return <Wrapper padding={16} gap={18}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    <ReadingChallengeHeader variant="compact" title={d.title} phase={d.phase} day={d.currentDay} durationDays={d.durationDays}
      startDate={d.startDate} mode={d.mode} participants={participants} />
    <ReadingRules variant="list" blockingMode={p.blockingMode} flagRecoveryDays={d.flagRecoveryDays} />
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
  const selectedBookArchived = p.library?.books.some(saved => saved.key === book.verified?.key && saved.finished);
  const bookReady = !selectedBookArchived && (READING_REQUIRE_VERIFIED_BOOK ? !!book.verified : book.title.trim().length >= 2);
  const startBook = book.verified ?? { title: book.title.trim(), author: book.author.trim() };
  const previousBook = (d.todayBooks ?? []).find(saved => saved.key === book.verified?.key)
    ?? p.library?.books.find(saved => saved.key === book.verified?.key);
  const startConfirmed = () => p.onStart(startBook.title, { author: startBook.author || undefined, bookKey: book.verified?.key,
    coverId: book.verified?.coverId, ...(previousBook?.nextPage != null ? { fromPage: previousBook.nextPage } : {}) });
  const approachOpen = !!d.session || !!p.resumableSession || running || awaitingPages;
  const confirmStrict = (onConfirm: () => void) => {
    if (p.blockingMode !== 'all-apps') { onConfirm(); return; }
    Alert.alert('Начать чтение в строгом режиме?',
      'На время чтения iOS ограничит все доступные для блокировки приложения и сайты. Divergents и выбранные вами разрешённые приложения останутся доступны. Остальные читалки, игры, соцсети, банки и карты могут блокироваться.\n\nКнопка «Пауза» сразу снимет ограничения, даже без интернета.',
      [{ text: 'Отмена', style: 'cancel' }, { text: 'Начать чтение', onPress: onConfirm }]);
  };
  const start = () => confirmStrict(startConfirmed);
  const closeInterrupted = () => Alert.alert('Закрыть прерванный подход?', 'Неподтверждённое время не будет начислено. Уже сохранённые подходы останутся.', [
    { text: 'Отмена', style: 'cancel' }, { text: 'Закрыть подход', onPress: p.onRecover },
  ]);
  // После остановки таймера книгу подхода можно сменить (если на старте выбрали не ту) — до записи страниц.
  const rebook = !!p.library && !!d.supportsReportBook && recording && !p.sessionNotice && !!d.session;
  const sessionBookKey = d.session?.bookKey ?? undefined;
  const shelfBooks = (p.library?.books ?? []).filter(saved => !saved.finished);
  const startBookOnShelf = !!sessionBookKey && shelfBooks.some(saved => saved.key === sessionBookKey);
  // Книга старта, которой нет на полке (первый подход), остаётся в списке, чтобы её можно было оставить.
  const baseReportShelf = rebook && d.session && !startBookOnShelf ? [{ key: sessionBookKey ?? `session:${d.session.id}`, title: d.session.book,
    author: d.session.author ?? '', coverId: d.session.coverId ?? null, pages: 0, elapsedMs: 0, nextPage: d.session.fromPage ?? null }, ...shelfBooks] : shelfBooks;
  const chosen = rebook && reportSelection?.scope === reportScope ? reportSelection.book : undefined;
  // Даже если книгу убрали с полки на другом устройстве, здесь остаётся явный выбор для этого подхода.
  const reportShelf = chosen ? baseReportShelf.some(saved => saved.key === chosen.key)
    ? baseReportShelf.map(saved => saved.key === chosen.key ? chosen : saved) : [chosen, ...baseReportShelf] : baseReportShelf;
  const reportBook: ReadingReportBook | undefined = chosen ? { book: chosen.title, author: chosen.author || undefined, bookKey: chosen.key,
    coverId: chosen.coverId ?? undefined, fromPage: chosen.nextPage ?? undefined } : undefined;
  const reportFromPage = chosen ? chosen.nextPage : d.session?.fromPage;
  const nextPage = reportFromPage != null && pages ? reportFromPage + Number(pages) : undefined;
  const pagesInvalid = !/^\d+$/.test(pages) || Number(pages) > 10000 || (nextPage ?? 0) > 100000;
  const submitPages = () => {
    const save = softPaused ? p.onSaveApproach : p.onReport;
    if (reportBook) save(Number(pages), nextPage, reportBook); else save(Number(pages), nextPage);
  };
  const sessionElapsedMs = p.sessionElapsedMs ?? d.session?.elapsedMs;
  // The approach's day is over (midnight passed before pages were written): its pages still belong to
  // that day, and saving them opens today's timer.
  const pastDay = d.session && d.session.day < d.currentDay ? readingShortDate(readingDayDate(d.startDate, d.session.day)) : undefined;
  const timerVisual = awaitingPages && p.localBusy ? 'saving' as const : recording ? 'recording' as const : p.timerState;
  const todayMinutes = Math.floor(todayMs / 60000);
  // A legacy cached review payload is not a save receipt. It never blocks reading,
  // but must not be presented as newly confirmed credit before server refresh.
  const savedToday = !recording && !running && todayMs > 0 && today?.state !== 'review';
  const idleAction = todayMs > 0 ? 'next' as const : 'start' as const;
  // До конца дня по серверу; часы телефона не могут «отодвинуть» полночь назад.
  const dayLeftMs = Math.max(0, d.dayEnd - Math.max(d.serverNow, p.nowMs ?? d.serverNow));
  // Исключения — настройка до чтения: во время подхода скрыты. Настроенные — одной строкой внизу,
  // а если нужно действие (ничего не выбрано, ошибка, доступ изменился) — карточкой выше «Сегодня».
  const allowedApps = p.allowedApps && d.phase !== 'finished' && !approachOpen
    ? { ...p.allowedApps, editable: p.allowedApps.editable && !p.busy && !p.sessionNotice } : undefined;
  const appsNeedAttention = !!allowedApps && (!allowedApps.count || allowedApps.needsReselection || !!allowedApps.error);
  return <Wrapper padding={16} gap={18}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    {p.offline || p.pendingApproaches ? <ReadingOfflineStatus state={p.offline ? 'offline' : 'sending'} pending={p.pendingApproaches} /> : null}
    {(p.rejectedApproaches ?? []).map(r => <InlineNotice key={r.sessionId} actionLabel="Понятно" onRetry={p.onDismissRejected}
      message={`Сервер не засчитал подход${r.book ? ` «${r.book}»` : ''}${r.elapsedMs != null ? ` (${Math.floor(r.elapsedMs / 60000)} мин${r.pages != null ? `, ${r.pages} стр.` : ''})` : ''}: ${r.message}`} />)}
    {p.sessionNotice ? <InlineNotice message={p.sessionNotice.message} onRetry={p.onRetry} /> : null}
    {member.eliminatedOn ? <InlineNotice message={`Участие завершено на ${member.eliminatedOn}-й день.`} /> : null}
    {d.phase === 'upcoming' ? <ScreenDescription text={`Челлендж начнётся ${readingDateLabel(d.startDate)}. В этот день здесь появится таймер.`} /> : null}
    {recording && !p.sessionNotice ? <Wrapper gap={12}>
      <ReadingPagesNotice state="required" />
      {pastDay ? <InlineNotice message={`Это подход за ${pastDay}: день закончился, но время подхода сохранено. Страницы засчитаются в ${pastDay}, а не в сегодняшний день.${reader ? ' После сохранения можно сразу начать чтение за сегодня.' : ''}`} /> : null}
      {rebook && p.library ? <ReadingBookshelf key={`report:${d.session?.id}`} purpose="report" composer={p.composer} disabled={p.localBusy}
        selectedKey={chosen?.key ?? sessionBookKey ?? `session:${d.session?.id}`}
        library={{ ...p.library, books: reportShelf, select: saved => {
          setReportSelection(saved.key === (sessionBookKey ?? `session:${d.session?.id}`)
            ? undefined : { scope: reportScope, book: { ...saved } });
          // Выбранная книга остаётся и для следующего подхода (кроме книги старта не с полки).
          if (shelfBooks.some(b => b.key === saved.key)) p.library?.select(saved);
        } }} /> : null}
      <ReadingPagesForm value={pages} onChange={setPages} busy={p.localBusy} invalid={pagesInvalid} onSubmit={submitPages}
        dayLabel={pastDay} submitLabel={pastDay && reader ? 'Сохранить и читать сегодня' : 'Сохранить подход'}
        bookTitle={chosen?.title ?? d.session?.book}
        sessionMinutes={sessionElapsedMs != null ? Math.floor(sessionElapsedMs / 60000) : undefined}
        fromPage={reportFromPage} nextPage={nextPage} />
    </Wrapper> : null}
    {reader && !p.sessionNotice ? <Wrapper gap={16}>
      <ReadingTimer remainingMs={p.remainingMs} state={timerVisual} blockingMode={p.blockingMode} extraMs={Math.max(0, todayMs - HOUR)}
        size={recording ? 'compact' : 'regular'} />
      {running && !awaitingPages ? <>
        <ReadingTimerControls action="pause" onPress={p.onPause} />
        {p.remainingMs <= 0 ? <ReadingPagesNotice state="goal" onRecord={p.onPause} busy={p.localBusy} /> : null}
      </>
        : recording ? softPaused && p.onResume ? <ReadingTimerControls action="resume" secondary disabled={!p.canResume || p.localBusy} onPress={p.onResume} /> : null
        : p.protection === 'unavailable' ? <InlineNotice message="Системная блокировка недоступна в этой сборке. Запустить защищённый сеанс пока нельзя." />
        : p.startRecovery && p.onContinueStart ? <Wrapper gap={10}>
          <InlineNotice message="Подход начат с этого телефона, но таймер ещё не запустился, время не начислялось. Продолжите запуск: включатся таймер и ограничения приложений."
            actionLabel="Продолжить запуск" onRetry={() => { const go = p.onContinueStart; if (go) confirmStrict(go); }} />
          {p.protection !== 'ready' ? <Button label={p.protection === 'permission' ? 'Разрешить блокировку' : 'Выбрать приложения'}
            variant="tinted" onPress={p.onPrepare} loading={p.busy} /> : null}
          <Button label="Отменить подход" variant="plain" disabled={p.busy} onPress={closeInterrupted}
            accessibilityHint="Закрыть начатый на сервере подход без времени и страниц" />
        </Wrapper>
        : p.needsRecovery ? <InlineNotice message="На сервере есть начатый подход, но на этом телефоне нет подтверждённого времени. Если чтение шло на другом устройстве, откройте его там."
          actionLabel="Закрыть прерванный подход" onRetry={closeInterrupted} />
        : softPaused ? <>
          {p.onResume ? <ReadingTimerControls action="resume" disabled={!p.canResume || p.localBusy} onPress={p.onResume} /> : null}
          <Button label="Записать страницы" variant="tinted" disabled={p.localBusy} onPress={() => setPagesRequested(true)}
            accessibilityHint={d.supportsReportBook ? 'Выбрать книгу, которую читали, и записать страницы этого подхода' : 'Завершить этот подход и сохранить страницы текущей книги. Потом можно выбрать другую книгу'} />
          <ScreenDescription text={d.supportsReportBook
            ? 'Можно продолжить чтение или записать страницы. Перед сохранением выберите книгу, которую читали. Все подходы складываются в общие 60 минут за день.'
            : 'Можно продолжить эту книгу или сохранить подход и выбрать другую. Все подходы складываются в общие 60 минут за день.'} />
        </>
        : <>
          {p.protection !== 'ready' ? <>
            <ScreenDescription text={p.blockingMode === 'all-apps'
              ? 'Разрешите Экранное время: во время чтения iOS ограничит приложения, кроме Divergents и выбранных вами исключений для чтения.'
              : 'Выберите соцсети и браузеры, которые будут недоступны во время чтения. Не выбирайте Divergents и приложение для книг.'} />
            <Button label={p.protection === 'permission' ? 'Разрешить блокировку' : 'Выбрать приложения'} variant="tinted" onPress={p.onPrepare} loading={p.busy} />
          </> : null}
          <ReadingTimerControls action={idleAction} onPress={start} loading={p.busy}
            disabled={p.startBlocked || approachOpen || p.protection !== 'ready' || !bookReady || !!p.allowedApps?.busy || !!p.composer?.adding} />
          {savedToday ? <ReadingSaveStatus variant="inline" state={p.pendingToday ? 'pending' : 'saved'}
            detail={`сегодня ${todayMinutes} мин · ${today?.pages ?? 0} стр.${p.pendingToday ? ' Отправим при связи' : ''}`} /> : null}
          {!bookReady ? <ScreenDescription text={p.library ? 'Добавьте книгу на полку и выберите её для подхода.' : READING_REQUIRE_VERIFIED_BOOK ? 'Чтобы начать, выберите и подтвердите книгу.' : 'Чтобы начать, напишите название книги.'} /> : null}
        </>}
      {p.library ? null : d.session ? <ReadingBookField status="verified" locked title={d.session.book} author={d.session.author ?? ''}
        onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} />
        : <ReadingBookField status={book.status} title={book.title} author={book.author} error={book.error} locked={p.busy || !!p.library}
          suggestions={book.suggestions} onPick={book.pick} onReject={book.reject} onManual={book.manual} manual={!!book.verified?.manual}
          onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} />}
    </Wrapper> : null}
    {p.library && !rebook ? <ReadingBookshelf key={`${d.id}:${member.userId}`} library={p.library} composer={p.composer}
      selectedKey={d.session?.bookKey ?? book.verified?.key} selectionLocked={approachOpen || !!p.sessionNotice || !reader}
      changeLater={!!d.supportsReportBook && approachOpen} disabled={p.busy} /> : null}
    {allowedApps && appsNeedAttention ? <ReadingAllowedAppsCard value={allowedApps} /> : null}
    {d.phase !== 'upcoming' ? <ReadingProgressSummary member={member} todayMs={d.phase === 'active' ? todayMs : undefined}
      dayLeftMs={d.phase === 'active' ? dayLeftMs : undefined}
      books={d.phase === 'active' && d.todayBooks?.length ? d.todayBooks : undefined} /> : null}
    <ReadingRankLink place={standing?.place ?? null} pagesPlace={pagesStanding?.place ?? null} participants={participants} onPress={p.onRanking} />
    {p.onHistory ? <ReadingHistoryLink onPress={() => p.onHistory?.(member.userId)} /> : null}
    {allowedApps && !appsNeedAttention ? <ReadingAllowedAppsCard variant="row" value={allowedApps} /> : null}
    <ReadingRules variant="collapsed" blockingMode={p.blockingMode} flagRecoveryDays={d.flagRecoveryDays} />
  </Wrapper>;
}

/** «24 октября» без года: день подхода рядом с сегодняшним. */
function readingShortDate(value: string) {
  return readingDateLabel(value).replace(/\s?\d{4}\s?г\.?$/, '').trim();
}
