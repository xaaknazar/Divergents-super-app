import React, { useState } from 'react';
import { Alert } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import type { ReadingApplicant } from '../data/readingApplicants';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ContentBlock } from './ContentBlock';
import { ListRow } from './ListRow';
import { ListSection } from './ListSection';
import { ScreenDescription } from './ScreenDescription';
import { InlineNotice } from './InlineNotice';
import { ContentLoading } from './ContentLoading';
import { Button } from './Button';
import { ReadingApplicantProfile } from './ReadingApplicantProfile';

export type ReadingApplicantsContentProps = {
  data?: ReadingDetail; loading: boolean; error?: string; selectedId?: string;
  applicant?: ReadingApplicant; profileLoading: boolean; profileError?: string;
  busy: boolean; pendingDecision?: 'approved' | 'rejected'; decisionError?: string; message?: string;
  onRetry: () => void; onSelect: (id: string) => void; onClose: () => void; onRetryProfile: () => void;
  onDecide: (id: string, decision: 'approved' | 'rejected') => void; onRetryDecision: () => void;
};
export function ReadingApplicantsContent(p: ReadingApplicantsContentProps) {
  const [page, setPage] = useState(0);
  const applications = p.data?.applications ?? [], selected = applications.find(a => a.id === p.selectedId);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(applications.length / 20) - 1));
  const canReview = p.data && (p.data.phase === 'upcoming' || p.data.phase === 'active' && p.data.mode === 'continuous');
  const confirm = (decision: 'approved' | 'rejected') => {
    if (!selected) return;
    Alert.alert(decision === 'approved' ? 'Принять в команду?' : 'Отклонить заявку?',
      `${selected.name}${decision === 'approved' ? ' станет участником вашей команды.' : ' не будет принят в команду.'}`,
      [{ text: 'Отмена', style: 'cancel' }, { text: decision === 'approved' ? 'Принять' : 'Отклонить',
        style: decision === 'rejected' ? 'destructive' : 'default', onPress: () => p.onDecide(selected.id, decision) }]);
  };
  return <Wrapper padding={16} gap={20}>
    {p.error ? <InlineNotice message={p.error} onRetry={p.onRetry} /> : null}
    {p.decisionError ? <InlineNotice message={p.decisionError} onRetry={p.pendingDecision && !p.busy ? p.onRetryDecision : undefined} /> : null}
    {p.pendingDecision && !p.busy ? <Button label="Проверить решение" variant="tinted" onPress={p.onRetryDecision} /> : null}
    {p.message ? <ScreenDescription text={p.message} /> : null}
    {selected ? <>
      <Button label="К списку заявок" icon="chevron.left" variant="plain" onPress={p.onClose} disabled={p.busy} />
      <PageHeading title={selected.name} description={p.data?.teams.find(t => t.id === selected.teamId)?.name ?? 'Заявка в команду'} />
      <ScreenDescription text="Анкета доступна только капитану этой команды и администраторам." />
      {p.profileLoading ? <ContentLoading /> : p.profileError ? <InlineNotice message={p.profileError} onRetry={p.onRetryProfile} />
        : p.applicant ? <ReadingApplicantProfile applicant={p.applicant} onRetry={p.onRetryProfile} /> : null}
      {canReview && (!p.applicant || p.applicant.status === 'pending') ? <Wrapper gap={12}>
        <Button label="Принять в команду" onPress={() => confirm('approved')} loading={p.busy && p.pendingDecision === 'approved'} disabled={p.busy || !!p.pendingDecision || !!p.profileError || p.profileLoading} />
        <Button label="Отклонить заявку" variant="tinted" tone="danger" onPress={() => confirm('rejected')} loading={p.busy && p.pendingDecision === 'rejected'} disabled={p.busy || !!p.pendingDecision || !!p.profileError || p.profileLoading} />
      </Wrapper> : <ScreenDescription text={canReview ? 'Решение по этой заявке уже принято. Обновите список заявок.' : 'Набор в этот челлендж завершён. Новые решения недоступны.'} />}
    </> : <>
      <PageHeading title="Заявки в команду" description={p.data?.title ?? 'Reading challenge'} summary={p.data ? `На рассмотрении: ${applications.length}` : undefined} />
      <ScreenDescription text="Откройте заявку, чтобы посмотреть анкету и принять решение. Капитану доступны только заявки в его команду." />
      {!p.data && p.loading ? <ContentLoading /> : p.data && !applications.length ? <ContentBlock><PageHeading title="Новых заявок пока нет" description="Когда участник выберет вашу команду, его заявка появится здесь." /></ContentBlock> : null}
      {applications.length ? <ListSection>{applications.slice(currentPage * 20, currentPage * 20 + 20).map(a => <ListRow key={a.id}
        title={a.name} subtitle={p.data?.teams.find(t => t.id === a.teamId)?.name ?? 'Заявка в команду'} detail="Анкета" chevron
        onPress={p.busy || p.pendingDecision ? undefined : () => p.onSelect(a.id)} />)}</ListSection> : null}
      {applications.length > 20 ? <Wrapper gap={8}>
        <ScreenDescription text={`Страница ${currentPage + 1} из ${Math.ceil(applications.length / 20)}`} />
        <Button label="Предыдущие заявки" variant="plain" disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} />
        <Button label="Следующие заявки" variant="plain" disabled={(currentPage + 1) * 20 >= applications.length} onPress={() => setPage(currentPage + 1)} />
      </Wrapper> : null}
    </>}
  </Wrapper>;
}
