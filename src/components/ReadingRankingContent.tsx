import React, { useState } from 'react';
import { ReadingDetail, ReadingRankingMetric, readingDaysOf, readingPaceOf, readingStandings } from '../data/reading';
import { Wrapper } from './Wrapper';
import { ContentBlock } from './ContentBlock';
import { ScreenDescription } from './ScreenDescription';
import { ReadingRankRow } from './ReadingRankRow';
import { Segmented } from './Segmented';

/** Два самостоятельных рейтинга по подтверждённым сервером данным. */
export function ReadingRankingContent({ data, onHistory, initialMetric = 'pace' }: {
  data: ReadingDetail; onHistory?: (userId: string) => void; initialMetric?: ReadingRankingMetric;
}) {
  const [metric, setMetric] = useState<ReadingRankingMetric>(initialMetric);
  const rows = readingStandings(data.ranking, metric);
  return <Wrapper padding={16} gap={12}>
    <Segmented items={['Средний темп', 'Всего страниц']} value={metric === 'pace' ? 0 : 1}
      onChange={index => setMetric(index === 1 ? 'pages' : 'pace')} />
    <ScreenDescription text={metric === 'pace'
      ? 'Выше тот, кто читает больше страниц в среднем за день. При равном темпе — тот, кто участвует дольше.'
      : 'Выше тот, кто прочитал больше страниц за всё участие в этом челлендже. При равном количестве — выше средний темп, затем больше дней участия.'} />
    {rows.length ? <ContentBlock size="flush">{rows.map(({ member: m, place }, i) =>
      <ReadingRankRow key={m.userId} place={place} name={m.name} readingDays={readingDaysOf(m)} flags={m.flags} pace={readingPaceOf(m)}
        pages={m.pages} metric={metric}
        isMe={m.userId === data.me?.userId}
        last={i === rows.length - 1} onPress={onHistory ? () => onHistory(m.userId) : undefined} />)}
    </ContentBlock> : <ScreenDescription text="Пока никто не вступил. Первые участники появятся здесь." />}
    <ScreenDescription text="Рейтинг доступен с первого дня. Средний темп: все сохранённые страницы делятся на календарные дни участия, включая пропуски. Всего страниц: подтверждённая сервером сумма по всем книгам за всё участие в этом челлендже, а не только за сегодня. Флаг ставится за день, когда к 00:00 по Алматы набрано меньше 60 минут; флаги накапливаются." />
  </Wrapper>;
}
