import React from 'react';
import { ReadingDetail, readingDaysOf, readingPaceOf, readingStandings } from '../data/reading';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { ReadingRankRow } from './ReadingRankRow';

/** «Рейтинг участников»: строки по среднему темпу в страницах, внизу — как считается место и флаги. */
export function ReadingRankingContent({ data, onHistory }: { data: ReadingDetail; onHistory?: (userId: string) => void }) {
  const rows = readingStandings(data.ranking);
  return <Wrapper padding={16} gap={12}>
    {rows.length ? <ContentBlock size="flush">{rows.map(({ member: m, place }, i) =>
      <ReadingRankRow key={m.userId} place={place} name={m.name} readingDays={readingDaysOf(m)} flags={m.flags} pace={readingPaceOf(m)}
        isMe={m.userId === data.me?.userId}
        last={i === rows.length - 1} onPress={onHistory ? () => onHistory(m.userId) : undefined} />)}
    </ContentBlock> : <ScreenDescription text="Пока никто не вступил. Первые участники появятся здесь." />}
    <ScreenDescription text="Рейтинг доступен с первого дня. Место — средний темп: все сохранённые страницы делятся на календарные дни участия, включая пропуски. Флаг ставится за день, когда к 00:00 по Алматы набрано меньше 60 минут; флаги накапливаются." />
  </Wrapper>;
}
