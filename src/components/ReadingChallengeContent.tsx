import React, { useEffect, useState } from 'react';
import { ReadingDetail } from '../data/reading';
import { Alert } from 'react-native';
import { Button } from './Button';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { PageHeading } from './PageHeading';
import { ScreenDescription } from './ScreenDescription';
import { ReadingTimer } from './ReadingTimer';
import { ReadingField } from './ReadingField';
import { InlineNotice } from './InlineNotice';
import { SectionTabs } from './SectionTabs';
import { ReadingReviewPanel } from './ReadingReviewPanel';
import { ReadingChallengeHeader } from './ReadingChallengeHeader';
import { ReadingProgressSummary } from './ReadingProgressSummary';
import { ReadingTeamCard } from './ReadingTeamCard';
import { ReadingMemberRow } from './ReadingMemberRow';
import { ReadingRules } from './ReadingRules';
import { ReadingBookPicker } from './ReadingBookPicker';
import { ReadingBookMetadata, ReadingBookSearchView, ReadingBookSelection } from '../data/readingBooks';
import { ReadingHeaderStyle } from '../data/readingAppearance';
import { readingDateLabel } from '../data/readingCreation';
import { ReadingJoinGuide } from './ReadingJoinGuide';

export type ReadingChallengeContentProps = {
  data: ReadingDetail; remainingMs: number; timerState: 'ready' | 'running' | 'paused' | 'complete';
  protection: 'unavailable' | 'permission' | 'selection' | 'ready'; busy: boolean; error?: string; awaitingPages: boolean;
  onPrepare: () => void; onStart: (book: string, metadata?: ReadingBookMetadata) => void; onPause: () => void; onReport: (pages: number, nextPage?: number) => void;
  bookSearch?: ReadingBookSearchView; onHistory?: (userId: string) => void;
  onJoin: (teamId: string) => void; onRetry: () => void;
  onApplications?: () => void; canReviewApplications?: boolean; headerVariant?: ReadingHeaderStyle;
  sessionNotice?: { kind: 'test-running' | 'other-account' | 'other-challenge'; message: string }; startBlocked?: boolean;
  needsRecovery: boolean; onRecover: () => void;
  onResolve: (userId: string, day: number, decision: 'accept' | 'reject', reason: string) => void;
};
export function ReadingChallengeContent(p: ReadingChallengeContentProps) {
  const [book, setBook] = useState<ReadingBookSelection>({ title: '', author: '' }), [pages, setPages] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [tab, setTab] = useState(0), [teamId, setTeamId] = useState<string | null>(null);
  const [rankPage, setRankPage] = useState(0);
  const d = p.data, today = d.me?.history.find(h => h.day === d.currentDay);
  useEffect(() => { setPages(''); }, [d.session?.id]);
  useEffect(() => { setRankPage(0); }, [teamId]);
  const ranked = d.ranking.filter(m => !teamId || m.teamId === teamId);
  const page = Math.min(rankPage, Math.max(0, Math.ceil(ranked.length / 20) - 1));
  const eligible = d.membership === 'approved' && d.phase === 'active' && !d.me?.eliminatedOn && today?.state !== 'review';
  const canJoin = (d.phase === 'upcoming' || d.phase === 'active' && d.mode === 'continuous') && (!d.membership || d.membership === 'rejected');
  const myTeam = d.teams.find(t => t.id === d.me?.teamId);
  const validFromPage = !fromPage || /^\d+$/.test(fromPage) && Number(fromPage) >= 1 && Number(fromPage) <= 100000;
  const start = () => p.onStart(book.title.trim(), { author: book.author.trim() || undefined, bookKey: book.key, coverId: book.coverId,
    fromPage: fromPage ? Number(fromPage) : undefined });
  const nextPage = d.session?.fromPage != null ? d.session.fromPage + Number(pages) : undefined;
  return <Wrapper padding={16} gap={18}>
    <ReadingChallengeHeader title={d.title} phase={d.phase} day={d.currentDay} durationDays={d.durationDays} startDate={d.startDate} mode={d.mode} variant={p.headerVariant} />
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    {p.sessionNotice ? <InlineNotice message={p.sessionNotice.message} onRetry={p.onRetry} /> : null}
    {canJoin ? <ReadingJoinGuide state="choose" /> : d.membership === 'pending' ? <ReadingJoinGuide state="pending" teamName={myTeam?.name} />
      : d.phase === 'upcoming' && d.membership === 'approved' ? <ReadingJoinGuide state="approved" teamName={myTeam?.name} startLabel={readingDateLabel(d.startDate)} /> : null}
    {d.membership === 'rejected' ? <InlineNotice message="Капитан отклонил заявку. Пока набор открыт, можно выбрать другую команду." /> : null}
    {d.me?.eliminatedOn ? <InlineNotice message={`Три красных флага. Участие завершено на ${d.me.eliminatedOn}-й день.`} /> : null}
    {today?.state === 'review' ? <InlineNotice message="Результат дня требует проверки. Он не засчитан как выполненный и не отмечен красным флагом." /> : null}
    <ReadingReviewPanel days={d.reviewDays} busy={p.busy} onResolve={p.onResolve} />
    {d.phase !== 'upcoming' && !p.sessionNotice && (eligible || p.awaitingPages || p.timerState === 'running') ? <ContentBlock><Wrapper gap={18}>
      <ReadingTimer remainingMs={p.remainingMs} state={p.timerState} />
      {p.protection === 'unavailable' ? <InlineNotice message="Системная блокировка недоступна в этой сборке. Запустить защищённый сеанс пока нельзя." />
        : p.protection !== 'ready' && p.timerState !== 'running' ? <>
          <ScreenDescription text="Выберите соцсети и браузеры, которые будут недоступны во время чтения. Не выбирайте Divergents и приложение для книг. Разрешение можно отозвать в настройках телефона." />
          <Button label={p.protection === 'permission' ? 'Разрешить блокировку' : 'Выбрать приложения'} onPress={p.onPrepare} loading={p.busy} />
        </> : null}
      {p.timerState === 'running' ? <>
        <Button label="Пауза и запись страниц" onPress={p.onPause} variant="tinted" />
        {p.remainingMs <= 0 ? <Button label="Завершить чтение и записать страницы" onPress={p.onPause} /> : null}
        <ScreenDescription text={p.remainingMs > 0 ? 'Обязательный час ещё идёт. На паузе блокировка снимается, прогресс сохраняется.' : 'Час пройден. Дополнительное время идёт автоматически; выбранные приложения остаются заблокированы.'} />
      </>
        : p.needsRecovery ? <InlineNotice message="На сервере есть начатый сеанс, но на этом телефоне нет подтверждённого времени. Если чтение шло на другом устройстве, откройте его там."
          actionLabel="Восстановить прерванный запуск" onRetry={() => Alert.alert('Закрыть прерванный запуск?', 'Неподтверждённое время не будет начислено. Уже сохранённые подходы останутся. После этого можно начать новый подход.', [
            { text: 'Отмена', style: 'cancel' }, { text: 'Закрыть запуск', onPress: p.onRecover },
          ])} /> : p.awaitingPages ? <>
          {d.session && d.session.day !== d.currentDay ? <InlineNotice message={`Это подход за день ${d.session.day}. Укажите страницы за него: они не будут записаны в новый день.`} /> : null}
          <ReadingField label="Страниц за этот подход" value={pages} onChange={setPages} kind="number" disabled={p.busy} />
          {nextPage !== undefined && pages ? <ScreenDescription text={`Следующий подход — со страницы ${nextPage}.`} /> : null}
          <Button label="Сохранить страницы" loading={p.busy} disabled={!/^\d+$/.test(pages) || Number(pages) > 10000 || (nextPage ?? 0) > 100000}
            onPress={() => { if (nextPage !== undefined) p.onReport(Number(pages), nextPage); else p.onReport(Number(pages)); }} />
          <ScreenDescription text="Укажите страницы именно за последний подход. Ноль допустим, если вас сразу отвлекли." />
        </> : today?.state === 'complete' ? <>
          <InlineNotice message="День выполнен. Время и страницы подтверждены сервером." />
          {eligible ? <><ReadingBookPicker value={book} onChange={setBook} disabled={p.busy} search={p.bookSearch} />
            <ReadingField label="Начальная страница" value={fromPage} onChange={setFromPage} kind="number" required={false} disabled={p.busy} error={!validFromPage ? 'Укажите страницу от 1 до 100 000' : undefined} />
            <Button label="Почитать ещё" onPress={start} loading={p.busy} disabled={p.startBlocked || p.protection !== 'ready' || !book.title.trim() || !validFromPage} /></> : null}
        </>
          : eligible ? <>
            <ReadingBookPicker value={book} onChange={setBook} disabled={p.busy} search={p.bookSearch} />
            <ReadingField label="Начальная страница" value={fromPage} onChange={setFromPage} kind="number" required={false} disabled={p.busy} error={!validFromPage ? 'Укажите страницу от 1 до 100 000' : undefined} />
            <Button label={today?.elapsedMs ? 'Продолжить чтение' : 'Начать чтение'} onPress={start}
              loading={p.busy} disabled={p.startBlocked || p.protection !== 'ready' || !book.title.trim() || !validFromPage} />
          </> : null}
    </Wrapper></ContentBlock> : null}
    {d.me && d.phase !== 'upcoming' ? <ReadingProgressSummary member={d.me} /> : null}
    {d.me && d.phase !== 'upcoming' && p.onHistory ? <Button label="Мои книги и история" variant="tinted" icon="book.fill" onPress={() => p.onHistory?.(d.me!.userId)} /> : null}
    {(p.canReviewApplications || d.applications.length > 0) && p.onApplications ? <Button label={`Заявки команды · ${d.applications.length}`} variant="tinted" icon="doc.text"
      onPress={p.onApplications} accessibilityHint="Открыть заявки и анкеты доступных вам участников" /> : null}
    <PageHeading title={d.phase === 'upcoming' || canJoin ? 'Команды и набор' : 'Рейтинг чтения'} />
    <SectionTabs items={[{ id: 0, label: 'Команды' }, { id: 1, label: 'Участники' }]} value={tab} onChange={setTab} />
    {tab === 0 ? d.teams.map((t, i) => <ReadingTeamCard key={t.id} team={t} rank={i + 1}
      recruiting={d.phase === 'upcoming' || canJoin} isMine={d.me?.teamId === t.id}
      canJoin={canJoin}
      busy={p.busy} onJoin={() => Alert.alert(`Заявка в «${t.name}»`, 'Капитан выбранной команды и администраторы смогут посмотреть вашу анкету. Капитан другой команды не увидит вашу заявку.', [
        { text: 'Отмена', style: 'cancel' }, { text: 'Отправить заявку', onPress: () => p.onJoin(t.id) },
      ])} onRoster={() => { setTeamId(t.id); setTab(1); }} />) : <Wrapper gap={10}>
      {teamId ? <Button label="Показать всех участников" variant="tinted" onPress={() => setTeamId(null)} /> : null}
      {ranked.length ? <ContentBlock size="flush">{ranked.slice(page * 20, (page + 1) * 20).map((m, i, visible) =>
        <ReadingMemberRow key={m.userId} member={m} rank={page * 20 + i + 1} day={d.currentDay}
          isMe={m.userId === d.me?.userId} phase={d.phase} last={i === visible.length - 1} onHistory={d.phase !== 'upcoming' && p.onHistory ? () => p.onHistory?.(m.userId) : undefined} />
      )}</ContentBlock> : <ScreenDescription text="После набора здесь появятся участники." />}
      {ranked.length > 20 ? <Wrapper gap={10}>
        <ScreenDescription text={`Участники ${page * 20 + 1}–${Math.min((page + 1) * 20, ranked.length)} из ${ranked.length}`} />
        <Button label="Предыдущие участники" variant="tinted" disabled={page === 0} onPress={() => setRankPage(page - 1)} />
        <Button label="Следующие участники" variant="tinted" disabled={(page + 1) * 20 >= ranked.length} onPress={() => setRankPage(page + 1)} />
      </Wrapper> : null}
    </Wrapper>}
    <ReadingRules mode={d.mode} />
  </Wrapper>;
}
