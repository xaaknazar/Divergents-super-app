import React from 'react';
import { ReadingChallengeDraft, readingDateLabel } from '../data/readingCreation';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { InlineNotice } from './InlineNotice';
import { Button } from './Button';

export function ReadingPublicationReview({ draft, busy, error, onRetry }: {
  draft: ReadingChallengeDraft; busy: boolean; error?: string; onRetry: () => void;
}) {
  return <Wrapper padding={16} gap={24}>
    <PageHeading title={busy ? 'Проверяем публикацию' : 'Сохранённая публикация'}
      description="Ниже — точные данные отправленного запроса. Проверим его результат, не создавая второй челлендж." />
    {error ? <InlineNotice message={error} /> : null}
    <ContentBlock><Wrapper gap={12}>
      <PageHeading title={draft.title} description={`${readingDateLabel(draft.startDate)} · ${draft.mode === 'continuous' ? 'без даты окончания' : `${draft.durationDays} дн.`}`} />
      <ScreenDescription text={draft.mode === 'continuous' ? 'Начало в 00:00 по Казахстану. Капитаны принимают заявки и после старта.' : 'Начало в 00:00 по Казахстану. Набор — до даты старта.'} />
    </Wrapper></ContentBlock>
    <PageHeading title={`Команды · ${draft.teams.length}`} />
    {draft.teams.map((t, i) => <ContentBlock key={i}><PageHeading title={t.name}
      description={`Капитан: ${t.captainNickname}`} summary={`Мест, включая капитана: ${t.capacity}`} /></ContentBlock>)}
    <Button label="Проверить публикацию" loading={busy} onPress={onRetry} size="large" />
    <ScreenDescription text="Можно вернуться позже: запрос сохранён на этом телефоне. Изменять данные безопасно только после ответа сервера." />
  </Wrapper>;
}
