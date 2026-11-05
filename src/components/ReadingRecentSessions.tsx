import React from 'react';
import { ReadingEditableSession } from '../data/readingBooks';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ScreenDescription } from './ScreenDescription';
import { ReadingSessionCorrection } from './ReadingSessionCorrection';
export function ReadingRecentSessions({ sessions, busy, onSave }: {
  sessions: ReadingEditableSession[]; busy: boolean; onSave: (session: ReadingEditableSession, pages: number) => Promise<void>;
}) {
  return <Wrapper gap={12}>
    <PageHeading title="Сегодня и вчера" description="Исправьте страницы в нужном подходе. Даты и время указаны по Алматы." />
    {sessions.map(session => <ReadingSessionCorrection key={session.id} session={session} busy={busy} onSave={onSave} />)}
    {!sessions.length ? <ScreenDescription text="Пока нет сохранённых подходов за сегодня и вчера. Более ранние результаты доступны в дневнике ниже." /> : null}
  </Wrapper>;
}
