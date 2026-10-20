import React, { useState } from 'react';
import { Alert } from 'react-native';
import type { ReadingDetail } from '../data/reading';
import { ContentBlock } from './ContentBlock';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ScreenDescription } from './ScreenDescription';
import { ReadingField } from './ReadingField';
import { Button } from './Button';

export function ReadingReviewPanel({ days, busy, onResolve }: { days: ReadingDetail['reviewDays']; busy: boolean;
  onResolve: (userId: string, day: number, decision: 'accept' | 'reject', reason: string) => void }) {
  const [reason, setReason] = useState('');
  if (!days.length) return null;
  const confirm = (day: typeof days[number], decision: 'accept' | 'reject') => Alert.alert(
    decision === 'accept' ? 'Подтвердить сохранённый результат?' : 'Отклонить результат дня?',
    decision === 'accept' ? 'Зачтутся только сохранённые минуты и страницы. Неполный час не станет выполненным днём.'
      : 'Спорные подходы не войдут в зачёт. Уже подтверждённое чтение сохранится. Если обязательный час не выполнен, за прошедший день появится красный флаг. История проверки сохранится.',
    [{ text: 'Отмена', style: 'cancel' }, { text: 'Подтвердить решение', style: decision === 'reject' ? 'destructive' : 'default',
      onPress: () => onResolve(day.userId, day.day, decision, reason.trim()) }]);
  return <ContentBlock><Wrapper gap={14}>
    <PageHeading title="Проверка спорных результатов" description="Только для администраторов. Сначала уточните причину у участника." />
    <ReadingField label="Причина решения" value={reason} onChange={setReason} disabled={busy} />
    {days.map(d => <Wrapper key={`${d.userId}:${d.day}`} gap={10}>
      <ScreenDescription text={`${d.name} · день ${d.day} · ${Math.floor(d.elapsedMs / 60000)} мин · ${d.pages} стр.`} />
      <Button label="Подтвердить сохранённое" onPress={() => confirm(d, 'accept')} disabled={busy || reason.trim().length < 5} />
      <Button label="Отклонить результат дня" variant="tinted" tone="danger" onPress={() => confirm(d, 'reject')} disabled={busy || reason.trim().length < 5} />
    </Wrapper>)}
  </Wrapper></ContentBlock>;
}
