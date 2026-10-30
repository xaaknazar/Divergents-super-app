import React, { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { CreationTextInput } from './CreationTextInput';
import { CreationField } from './CreationField';
import { CreationFormLayout } from './CreationFormLayout';
import { CreationTypePicker } from './CreationTypePicker';
import { ReadingStartDateField } from './ReadingStartDateField';
import { Wrapper } from './Wrapper';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { ScreenDescription } from './ScreenDescription';
import { READING_CHALLENGE_RULES } from '../data/reading';
import { nextReadingDate, readingDateError, ReadingChallengeDraft } from '../data/readingCreation';
export type { ReadingChallengeDraft } from '../data/readingCreation';

/** Создание Reading challenge: индивидуальный зачёт без команд и капитанов, без даты окончания.
 * Каждый участник начинает со своего дня вступления. */
export function ReadingChallengeForm({ busy, error, onSubmit, initialDraft, onCancel = () => {} }: {
  busy: boolean; error?: string; onSubmit: (draft: ReadingChallengeDraft) => void; initialDraft?: ReadingChallengeDraft; onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialDraft?.title ?? ''), [startDate, setStartDate] = useState(initialDraft?.startDate ?? nextReadingDate());
  const [rulesOpen, setRulesOpen] = useState(false), [attempted, setAttempted] = useState(false);
  const titleError = title.trim().length < 2 || title.trim().length > 120 ? 'Название — от 2 до 120 символов' : undefined;
  const dateError = readingDateError(startDate, Date.now(), 'continuous');
  const firstError = titleError ?? dateError;
  const submit = () => {
    setAttempted(true);
    const first = titleError ?? readingDateError(startDate, Date.now(), 'continuous');
    if (first) { AccessibilityInfo.announceForAccessibility(`Проверьте форму. ${first}`); return; }
    onSubmit({ title: title.trim(), startDate, durationDays: 1, mode: 'continuous', teams: [] });
  };
  return <CreationFormLayout onCancel={onCancel} onSubmit={submit} busy={busy}
    error={attempted && firstError ? `Проверьте поля выше: ${firstError}` : undefined}>
    <CreationTypePicker options={[{ key: 'reading', label: 'Читательский челлендж' }]} value="reading" />
    <ScreenDescription text="Индивидуальный зачёт: без команд и капитанов. Каждый вступает сам, после согласия с правилами, и начинает со своего дня 1. Два рейтинга: по среднему темпу в страницах в день и по общему количеству прочитанных страниц." />
    {error ? <InlineNotice message={error} /> : null}
    <CreationField label="Название" error={attempted ? titleError : undefined}>
      <CreationTextInput label="Название челленджа" value={title} onChange={setTitle} disabled={busy} placeholder="Название челленджа" />
    </CreationField>
    <ReadingStartDateField value={startDate} onChange={setStartDate} disabled={busy} mode="continuous" error={attempted ? dateError : undefined} />
    <Wrapper gap={12} marginTop={14}>
      <Button label="Правила для участников" variant="plain" expanded={rulesOpen} onPress={() => setRulesOpen(v => !v)} />
      {rulesOpen ? READING_CHALLENGE_RULES.map((rule, i) => <ScreenDescription key={rule.title} text={`${i + 1}. ${rule.title}. ${rule.text}`} />) : null}
    </Wrapper>
  </CreationFormLayout>;
}
