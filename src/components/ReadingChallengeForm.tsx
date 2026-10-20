import React, { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { CreationTextInput } from './CreationTextInput';
import { CreationField } from './CreationField';
import { CreationFormLayout } from './CreationFormLayout';
import { CreationTypePicker } from './CreationTypePicker';
import { ReadingStartDateField } from './ReadingStartDateField';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { READING_RULES, CONTINUOUS_READING_RULES } from '../data/reading';
import { nextReadingDate, readingDateError, ReadingChallengeDraft } from '../data/readingCreation';
import { ScreenDescription } from './ScreenDescription';
import { SectionTabs } from './SectionTabs';
export type { ReadingChallengeDraft } from '../data/readingCreation';

export function ReadingChallengeForm({ busy, error, onSubmit, initialDraft, onCancel = () => {} }: {
  busy: boolean; error?: string; onSubmit: (draft: ReadingChallengeDraft) => void; initialDraft?: ReadingChallengeDraft; onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialDraft?.title ?? ''), [startDate, setStartDate] = useState(initialDraft?.startDate ?? nextReadingDate());
  const [days, setDays] = useState(String(initialDraft?.durationDays ?? 21)), [rulesOpen, setRulesOpen] = useState(false);
  // New clubs are ongoing. A saved draft without a mode predates ongoing
  // clubs and must retain its scheduled meaning when publication is retried.
  const [mode, setMode] = useState<'scheduled' | 'continuous'>(initialDraft ? initialDraft.mode ?? 'scheduled' : 'continuous');
  const [attempted, setAttempted] = useState(false);
  const [teams, setTeams] = useState(initialDraft?.teams.map(t => ({ ...t, capacity: String(t.capacity) }))
    ?? [{ name: 'Команда 1', capacity: '20', captainNickname: '' }]);
  const titleError = title.trim().length < 2 || title.trim().length > 120 ? 'Название — от 2 до 120 символов' : undefined;
  const dateError = readingDateError(startDate, Date.now(), mode);
  const daysError = mode === 'scheduled' && (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 90) ? 'Укажите от 1 до 90 дней' : undefined;
  const teamErrors = teams.map(t => ({
    name: !t.name.trim() || t.name.trim().length > 80 ? 'Название команды — от 1 до 80 символов' : undefined,
    capacity: !/^\d+$/.test(t.capacity) || Number(t.capacity) < 1 || Number(t.capacity) > 100 ? 'От 1 до 100 мест, включая капитана' : undefined,
    captainNickname: !t.captainNickname.trim() || t.captainNickname.trim().length > 80 ? 'Укажите существующий псевдоним капитана (до 80 символов)'
      : teams.filter(other => other.captainNickname.trim().toLowerCase() === t.captainNickname.trim().toLowerCase()).length > 1 ? 'Для каждой команды нужен отдельный капитан' : undefined,
  }));
  const edit = (index: number, field: keyof typeof teams[number], value: string) => setTeams(ts => ts.map((t, i) => i === index ? { ...t, [field]: value } : t));
  const firstError = [titleError, dateError, daysError, ...teamErrors.flatMap(Object.values)].find(Boolean);
  const submit = () => {
    setAttempted(true);
    const first = [titleError, readingDateError(startDate, Date.now(), mode), daysError, ...teamErrors.flatMap(Object.values)].find(Boolean);
    if (first) { AccessibilityInfo.announceForAccessibility(`Проверьте форму. ${first}`); return; }
    onSubmit({ title: title.trim(), startDate, durationDays: mode === 'continuous' ? 1 : Number(days), ...(mode === 'continuous' ? { mode } : {}),
      teams: teams.map(t => ({ name: t.name.trim(), captainNickname: t.captainNickname.trim(), capacity: Number(t.capacity) })) });
  };
  return <CreationFormLayout onCancel={onCancel} onSubmit={submit} busy={busy}
    error={attempted && firstError ? `Проверьте поля выше: ${firstError}` : undefined}>
    <CreationTypePicker options={[{ key: 'reading', label: 'Читательский челлендж' }]} value="reading" />
    <CreationField label="Формат чтения">
      <Wrapper marginBottom={16}><SectionTabs items={[{ id: 0, label: 'На срок' }, { id: 1, label: 'Постоянный' }]} value={mode === 'continuous' ? 1 : 0} onChange={value => { if (!busy) setMode(value === 1 ? 'continuous' : 'scheduled'); }} /></Wrapper>
      <ScreenDescription text={mode === 'continuous' ? 'Без даты окончания и выбывания. Вступление через капитана. Рейтинг по среднему времени чтения в день.' : 'Ограниченная длительность. Три красных флага — завершение участия.'} />
    </CreationField>
    {error ? <InlineNotice message={error} /> : null}
    <CreationField label="Название" error={attempted ? titleError : undefined}>
      <CreationTextInput label="Название челленджа" value={title} onChange={setTitle} disabled={busy} placeholder="Название челленджа" />
    </CreationField>
      <ReadingStartDateField value={startDate} onChange={setStartDate} disabled={busy} mode={mode} error={attempted ? dateError : undefined} />
    {mode === 'scheduled' ? <CreationField label="Длительность (дней)" error={attempted ? daysError : undefined} hint="От 1 до 90 дней. Каждый день — 60 минут чтения.">
      <CreationTextInput label="Длительность в днях" value={days} onChange={setDays} kind="number" disabled={busy} />
    </CreationField> : null}
    <CreationField label="Команды и капитаны" hint="Капитан входит в число мест. Заявки доступны только капитану своей команды и администраторам.">
    {teams.map((t, i) => <Wrapper key={i} marginBottom={8}><ContentBlock size="compact">
      <CreationField label={`Команда ${i + 1}`} error={attempted ? teamErrors[i].name : undefined}>
        <CreationTextInput label={`Название команды ${i + 1}`} value={t.name} onChange={v => edit(i, 'name', v)} disabled={busy} />
      </CreationField>
      <CreationField label="Мест, включая капитана" error={attempted ? teamErrors[i].capacity : undefined}>
        <CreationTextInput label={`Мест в команде ${i + 1}`} value={t.capacity} onChange={v => edit(i, 'capacity', v)} kind="number" disabled={busy} />
      </CreationField>
      <CreationField label="Псевдоним капитана" error={attempted ? teamErrors[i].captainNickname : undefined}>
        <CreationTextInput label={`Псевдоним капитана команды ${i + 1}`} value={t.captainNickname} onChange={v => edit(i, 'captainNickname', v)} kind="nickname" disabled={busy} placeholder="Псевдоним из приложения" />
      </CreationField>
      {teams.length > 1 ? <Button label={`Убрать команду ${i + 1}`} variant="plain" tone="danger" disabled={busy} onPress={() => setTeams(ts => ts.filter((_, j) => j !== i))} /> : null}
    </ContentBlock></Wrapper>)}
    <Button label="Добавить команду" icon="plus" variant="plain" disabled={busy || teams.length >= 30} onPress={() => setTeams(ts => [...ts, { name: `Команда ${ts.length + 1}`, capacity: '20', captainNickname: '' }])} />
    </CreationField>
    <Wrapper gap={12} marginTop={14}>
      <Button label="Правила для участников" variant="plain" expanded={rulesOpen} onPress={() => setRulesOpen(v => !v)} />
      {rulesOpen ? (mode === 'continuous' ? CONTINUOUS_READING_RULES : READING_RULES).map(rule => <ScreenDescription key={rule} text={rule} />) : <ScreenDescription text={mode === 'continuous' ? '60 минут в день. Пропуски снижают среднее, но не исключают участника. Первые 10 дней — наблюдение перед рейтингом.' : '60 минут чтения в день. Три красных флага — завершение участия. Страницы записываются после каждого подхода.'} />}
    </Wrapper>
  </CreationFormLayout>;
}
