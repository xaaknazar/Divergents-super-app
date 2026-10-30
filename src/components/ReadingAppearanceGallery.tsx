import React from 'react';
import { ReadingCatalogItem } from '../data/reading';
import { READING_CARD_STYLES, READING_HEADER_STYLES, ReadingAppearance } from '../data/readingAppearance';
import { ReadingChallengeCard } from './ReadingChallengeCard';
import { ReadingChallengeHeader } from './ReadingChallengeHeader';
import { Wrapper } from './Wrapper';
import { PageHeading } from './PageHeading';
import { ScreenDescription } from './ScreenDescription';
import { Button } from './Button';

const preview: ReadingCatalogItem = { id: 'appearance-preview', title: 'Время для книги', phase: 'active', startDate: '2026-10-20', durationDays: 1, mode: 'continuous', membership: 'approved' };
/** Uses the actual components; previews cannot join or change a real challenge. */
export function ReadingAppearanceGallery({ value, onChange, saving = false }: {
  value: ReadingAppearance; onChange: (patch: Partial<ReadingAppearance>) => void; saving?: boolean;
}) {
  return <Wrapper padding={16} gap={28}>
    <ScreenDescription text="Выберите оформление для этого телефона. Примеры ниже — не настоящий челлендж. Цвета, команды и результаты не меняются." />
    <PageHeading title="Карточка в сообществе" />
    {READING_CARD_STYLES.map(option => <Wrapper key={option.id} gap={12}>
      <ScreenDescription text={option.description} />
      <ReadingChallengeCard challenge={preview} variant={option.id} onPress={() => { if (!saving) onChange({ card: option.id }); }} />
      <Button label={`${option.title}${value.card === option.id ? ' · выбрано' : ' · выбрать'}`} icon={value.card === option.id ? 'checkmark.circle.fill' : undefined}
        variant={value.card === option.id ? 'tinted' : 'outline'} selected={value.card === option.id} disabled={saving} onPress={() => onChange({ card: option.id })} />
    </Wrapper>)}
    <PageHeading title="Шапка Reading challenge" />
    {READING_HEADER_STYLES.map(option => <Wrapper key={option.id} gap={12}>
      <ReadingChallengeHeader title={preview.title} phase="active" day={1} durationDays={1} startDate={preview.startDate} mode="continuous" variant={option.id} />
      <Button label={`${option.title}${value.header === option.id ? ' · выбрано' : ' · выбрать'}`} icon={value.header === option.id ? 'checkmark.circle.fill' : undefined}
        variant={value.header === option.id ? 'tinted' : 'outline'} selected={value.header === option.id} disabled={saving} onPress={() => onChange({ header: option.id })} />
    </Wrapper>)}
  </Wrapper>;
}
