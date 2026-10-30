import React from 'react';
import { ReadingCatalogItem } from '../data/reading';
import { ReadingChallengeCard } from './ReadingChallengeCard';
import { Wrapper } from './Wrapper';
import { InlineNotice } from './InlineNotice';
import { SectionHeader } from './SectionHeader';
import { ReadingCardStyle } from '../data/readingAppearance';

export function ReadingChallengeShelf({ items, error, onRetry, onOpen, variant }: {
  items: ReadingCatalogItem[]; error: boolean; onRetry: () => void; onOpen: (id: string) => void;
  variant?: ReadingCardStyle;
}) {
  if (!items.length && !error) return null; // Successful disabled/empty catalog stays hidden; failures must remain retryable.
  return <><SectionHeader title="Reading challenge" />
    {error ? <Wrapper padding={16}><InlineNotice message={items.length
      ? 'Не удалось обновить список. Сохранённые челленджи можно открыть.'
      : 'Список пока не сохранён на телефоне. При подключении откройте свой Reading challenge один раз — затем сможете возвращаться к чтению без сети.'} onRetry={onRetry} /></Wrapper> : null}
    {items.map(c => <Wrapper key={c.id} marginHorizontal={16} marginBottom={16}>
      <ReadingChallengeCard challenge={c} variant={variant} onPress={() => onOpen(c.id)} />
    </Wrapper>)}
  </>;
}
