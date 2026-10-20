import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { READING_REQUIRE_VERIFIED_BOOK, ReadingDetail, readingStandings, readingWaitReason } from '../data/reading';
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
import { ReadingBookField, ReadingBookFieldStatus } from './ReadingBookField';
import { ReadingTimer } from './ReadingTimer';
import { ReadingTimerControls } from './ReadingTimerControls';
import { ReadingPagesForm } from './ReadingPagesForm';
import { ReadingSaveStatus } from './ReadingSaveStatus';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingHistoryLink } from './ReadingHistoryLink';

const HOUR = 3_600_000;
export type ReadingBookInput = {
  title: string; author: string; status: ReadingBookFieldStatus; error?: string;
  verified: { title: string; author: string; key?: string; coverId?: number; manual?: boolean } | null;
  suggestions: { title: string; author: string }[]; pick: (index: number) => void; reject: () => void; manual: () => void;
  setTitle: (value: string) => void; setAuthor: (value: string) => void; check: () => void; edit: () => void;
};
export type ReadingChallengeContentProps = {
  data: ReadingDetail; remainingMs: number; timerState: 'ready' | 'running' | 'paused' | 'complete';
  protection: 'unavailable' | 'permission' | 'selection' | 'ready'; busy: boolean; error?: string; awaitingPages: boolean;
  blockingMode?: 'selected' | 'all-apps';
  resumableSession?: boolean; canResume?: boolean; onResume?: () => void;
  onPrepare: () => void; onStart: (book: string, metadata?: ReadingBookMetadata) => void; onPause: () => void;
  /** Страницы после мягкой паузы: закрыть подход на телефоне и отправить страницы. */
  onSaveApproach: (pages: number, nextPage?: number) => void;
  /** Страницы уже закрытого подхода. */
  onReport: (pages: number, nextPage?: number) => void;
  book: ReadingBookInput;
  onJoin: () => void; onRetry: () => void; onRanking: () => void; onHistory?: (userId: string) => void;
  sessionNotice?: { kind: 'test-running' | 'other-account' | 'other-challenge'; message: string }; startBlocked?: boolean;
  needsRecovery: boolean; onRecover: () => void;
};

/** Reading challenge, индивидуальный зачёт. Не участник — вступление: компактный блок, правила, галочка,
 * «Присоединиться». Участник — сверху вниз: таймер и действия/статус подхода, «Что читаете»,
 * «Сегодня», «Мой рейтинг», «Мои книги и история», свёрнутые правила. */
export function ReadingChallengeContent(p: ReadingChallengeContentProps) {
  const d = p.data;
  const [agreed, setAgreed] = useState(false);
  const [pages, setPages] = useState('');
  useEffect(() => { setPages(''); }, [d.session?.id]);
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
  const inReview = today?.state === 'review';
  const running = p.timerState === 'running';
  const softPaused = !!p.resumableSession && p.timerState === 'paused' && !p.awaitingPages;
  const recording = softPaused || p.awaitingPages;
  const standing = readingStandings(d.ranking).find(s => s.member.userId === member.userId);
  const book = p.book;
  const bookReady = READING_REQUIRE_VERIFIED_BOOK ? !!book.verified : book.title.trim().length >= 2;
  const startBook = book.verified ?? { title: book.title.trim(), author: book.author.trim() };
  const startConfirmed = () => p.onStart(startBook.title, { author: startBook.author || undefined, bookKey: book.verified?.key, coverId: book.verified?.coverId });
  const start = () => {
    if (p.blockingMode !== 'all-apps') { startConfirmed(); return; }
    Alert.alert('Начать чтение в строгом режиме?',
      'На время чтения iOS ограничит все доступные для блокировки приложения и сайты, включая игры, соцсети, банки, карты и читалки. Divergents останется доступен.\n\nКнопка «Пауза» сразу снимет ограничения, даже без интернета.',
      [{ text: 'Отмена', style: 'cancel' }, { text: 'Начать чтение', onPress: startConfirmed }]);
  };
  const nextPage = d.session?.fromPage != null && pages ? d.session.fromPage + Number(pages) : undefined;
  const pagesInvalid = !/^\d+$/.test(pages) || Number(pages) > 10000 || (nextPage ?? 0) > 100000;
  const submitPages = () => (softPaused ? p.onSaveApproach : p.onReport)(Number(pages), nextPage);
  const timerVisual = p.awaitingPages && p.busy ? 'saving' as const : recording ? 'recording' as const
    : inReview && !running ? 'ready' as const : p.timerState;
  const todayMinutes = Math.floor(todayMs / 60000);
  const savedToday = !recording && !running && todayMs > 0 && !inReview;
  const idleAction = todayMs > 0 ? 'resume' as const : 'start' as const;
  return <Wrapper padding={16} gap={18}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    {p.sessionNotice ? <InlineNotice message={p.sessionNotice.message} onRetry={p.onRetry} /> : null}
    {member.eliminatedOn ? <InlineNotice message={`Участие завершено на ${member.eliminatedOn}-й день.`} /> : null}
    {d.phase === 'upcoming' ? <ScreenDescription text={`Челлендж начнётся ${readingDateLabel(d.startDate)}. В этот день здесь появится таймер.`} /> : null}
    {reader && !p.sessionNotice ? <Wrapper gap={16}>
      <ReadingTimer remainingMs={p.remainingMs} state={timerVisual} blockingMode={p.blockingMode} extraMs={Math.max(0, todayMs - HOUR)} />
      {running ? <ReadingTimerControls action="pause" onPress={p.onPause} />
        : p.protection === 'unavailable' ? <InlineNotice message="Системная блокировка недоступна в этой сборке. Запустить защищённый сеанс пока нельзя." />
        : p.needsRecovery ? <InlineNotice message="На сервере есть начатый подход, но на этом телефоне нет подтверждённого времени. Если чтение шло на другом устройстве, откройте его там."
          actionLabel="Закрыть прерванный подход" onRetry={() => Alert.alert('Закрыть прерванный подход?', 'Неподтверждённое время не будет начислено. Уже сохранённые подходы останутся.', [
            { text: 'Отмена', style: 'cancel' }, { text: 'Закрыть подход', onPress: p.onRecover },
          ])} />
        : recording ? <>
          {softPaused && p.onResume ? <ReadingTimerControls action="resume" secondary disabled={!p.canResume} onPress={p.onResume} /> : null}
          {d.session && d.session.day !== d.currentDay ? <InlineNotice message={`Это подход за прошлый день. Страницы запишутся в тот день, а не в сегодняшний.`} /> : null}
          <ReadingPagesForm value={pages} onChange={setPages} busy={p.busy} invalid={pagesInvalid} onSubmit={submitPages}
            sessionMinutes={d.session?.elapsedMs != null ? Math.floor(d.session.elapsedMs / 60000) : undefined}
            fromPage={d.session?.fromPage} nextPage={nextPage} />
        </>
        : inReview ? <ReadingSaveStatus state="review" detail="Сегодняшний подход на проверке, новый начать нельзя. Чтение снова откроется завтра." />
        : <>
          {savedToday ? <ReadingSaveStatus state="saved" detail={`Сегодня: ${todayMinutes} мин · ${today?.pages ?? 0} стр. Подтверждено сервером.`} /> : null}
          {p.protection !== 'ready' ? <>
            <ScreenDescription text={p.blockingMode === 'all-apps'
              ? 'Разрешите Экранное время: во время чтения iOS ограничит все приложения, которые можно блокировать, кроме Divergents.'
              : 'Выберите соцсети и браузеры, которые будут недоступны во время чтения. Не выбирайте Divergents и приложение для книг.'} />
            <Button label={p.protection === 'permission' ? 'Разрешить блокировку' : 'Выбрать приложения'} variant="tinted" onPress={p.onPrepare} loading={p.busy} />
          </> : null}
          <ReadingTimerControls action={idleAction} onPress={start} loading={p.busy}
            disabled={p.startBlocked || p.protection !== 'ready' || !bookReady} />
          {!bookReady ? <ScreenDescription text={READING_REQUIRE_VERIFIED_BOOK ? 'Чтобы начать, выберите и подтвердите книгу.' : 'Чтобы начать, напишите название книги.'} /> : null}
        </>}
      {d.session ? <ReadingBookField status="verified" locked title={d.session.book} author={d.session.author ?? ''}
        onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} />
        : <ReadingBookField status={book.status} title={book.title} author={book.author} error={book.error} locked={p.busy}
          suggestions={book.suggestions} onPick={book.pick} onReject={book.reject} onManual={book.manual} manual={!!book.verified?.manual}
          onChangeTitle={book.setTitle} onChangeAuthor={book.setAuthor} onCheck={book.check} onEdit={book.edit} />}
    </Wrapper> : null}
    {d.phase !== 'upcoming' ? <ReadingProgressSummary member={member} todayMs={d.phase === 'active' ? todayMs : undefined} /> : null}
    <ReadingRankLink place={standing?.place ?? null} participants={participants} onPress={p.onRanking}
      waitReason={standing && standing.place == null ? readingWaitReason(standing.member) : undefined} review={!!standing?.member.rankingPending} />
    {p.onHistory ? <ReadingHistoryLink onPress={() => p.onHistory?.(member.userId)} /> : null}
    <ReadingRules variant="collapsed" blockingMode={p.blockingMode} />
  </Wrapper>;
}
