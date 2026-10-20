import React from 'react';
import { type ReadingApplicant } from '../data/readingApplicants';
import { resumeRows } from '../data/talentslab';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { PageHeading } from './PageHeading';
import { FieldValueRow } from './FieldValueRow';
import { ScreenDescription } from './ScreenDescription';
import { Button } from './Button';

export function ReadingApplicantProfile({ applicant, onRetry }: { applicant: ReadingApplicant; onRetry: () => void }) {
  const p = applicant.profile, rows = resumeRows(p?.resume ?? null);
  if (!p) return <ContentBlock><Wrapper gap={12}>
    <PageHeading title="Анкета пока недоступна" description={applicant.profileStatus === 'unavailable'
      ? 'Сервис анкет не ответил. Это не означает, что участник не заполнил анкету.'
      : 'Сохранённая анкета пока не получена. Участник может открыть свою анкету в профиле и синхронизировать её.'} />
    <Button label="Повторить загрузку анкеты" variant="tinted" onPress={onRetry} />
  </Wrapper></ContentBlock>;
  return <Wrapper gap={20}>
    {applicant.profileStatus === 'snapshot' ? <ScreenDescription text="Показана сохранённая анкета. Свежую версию можно загрузить повторно." /> : null}
    <ContentBlock><Wrapper gap={12}>
      <PageHeading title="Профиль участника" />
      <FieldValueRow label="Имя" value={p.fullName} hideWhenEmpty />
      <FieldValueRow label="Город" value={p.currentCity} hideWhenEmpty />
      <FieldValueRow label="Почта" value={p.email} hideWhenEmpty />
      <FieldValueRow label="Телефон" value={p.phone} hideWhenEmpty />
      <FieldValueRow label="MBTI" value={p.mbtiType ? `${p.mbtiType}${p.mbtiName ? ` · ${p.mbtiName}` : ''}` : undefined} hideWhenEmpty />
    </Wrapper></ContentBlock>
    {rows.length ? <ContentBlock><Wrapper gap={12}><PageHeading title="Анкета" />
      {rows.map((row, i) => <FieldValueRow key={`${row.label}:${i}`} label={row.label} value={row.value} />)}
    </Wrapper></ContentBlock> : null}
    {p.gallup.length ? <ContentBlock><Wrapper gap={12}><PageHeading title="Таланты Gallup" />
      {p.gallup.map(g => <FieldValueRow key={g.rank} label={`${g.rank}`} value={g.name} />)}
    </Wrapper></ContentBlock> : null}
    {p.gardner.length ? <ContentBlock><Wrapper gap={12}><PageHeading title="Интеллекты Гарднера" />
      {[...p.gardner].sort((a, b) => b.score - a.score).map(g => <FieldValueRow key={g.category} label={g.category} value={`${g.score}%`} />)}
    </Wrapper></ContentBlock> : null}
    <Button label="Обновить анкету" variant="plain" onPress={onRetry} />
  </Wrapper>;
}
