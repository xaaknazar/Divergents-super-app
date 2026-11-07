import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ReadingDetail, ReadingRankingMetric, readingDaysOf, readingPaceOf, readingStandings } from '../data/reading';
import { readingPaceTopDaysLeft } from '../data/readingPaceRanking';
import { InlineNotice } from './InlineNotice';
import { days } from '../data/plural';
import { fmtDecimal, fmtInt } from '../data/format';
import { useTheme } from '../theme/ThemeContext';
import { Wrapper } from './Wrapper';
import { ScreenDescription } from './ScreenDescription';
import { RankingCard } from './ChallengeRanking';
import { StandingsTable, StandingRow, shortPersonName } from './StandingsTable';
import { WashSurface } from './ColorWash';
import { MemberAvatar } from './MemberAvatar';
import { radius } from '../theme/tokens';

const TABS = ['Всего страниц', 'Средний темп'];

/** Рейтинг Reading в стиле Apple Sports: карточка «Рейтинг» с переключателем «Всего страниц | Средний темп».
 * Оба результата видны всегда: выбранный — жирной колонкой справа, второй — серой рядом. */
export function ReadingRankingContent({ data, onHistory, initialMetric = 'pages' }: {
  data: ReadingDetail; onHistory?: (userId: string) => void; initialMetric?: ReadingRankingMetric;
}) {
  const { T, ty } = useTheme();
  const [metric, setMetric] = useState<ReadingRankingMetric>(initialMetric);
  const pagesFirst = metric === 'pages';
  const protectPaceTop = data.mode === 'continuous';
  const paceDaysLeft = data.me && protectPaceTop ? readingPaceTopDaysLeft(data.me) : 0;
  const rows: StandingRow[] = readingStandings(data.ranking, metric, protectPaceTop).map(({ member: m, place }) => {
    const pace = readingPaceOf(m);
    const readingDays = readingDaysOf(m);
    const isMe = m.userId === data.me?.userId;
    const paceText = fmtDecimal(pace);
    const pagesText = fmtInt(m.pages);
    const daysLeft = !pagesFirst && protectPaceTop ? readingPaceTopDaysLeft(m) : 0;
    const subtitle = daysLeft > 0 ? `До допуска в топ-20: ${days(daysLeft)}` : `${days(readingDays)} чтения`;
    return {
      id: m.userId, rank: place, name: shortPersonName(m.name), fullName: m.name,
      subtitle,
      avatar: { uri: m.avatar },
      change: (pagesFirst ? m.pagesRankChange : m.paceRankChange) ?? null, flags: m.flags, points: m.pages, isMine: isMe,
      value: pagesFirst ? pagesText : paceText,
      secondary: pagesFirst ? paceText : pagesText,
      a11yLabel: [`${place} место`, m.name, isMe ? 'это вы' : null, `${days(readingDays)} чтения`, daysLeft > 0 ? subtitle : null,
        `красных флагов: ${m.flags}`, `всего прочитано ${pagesText} страниц`, `средний темп ${paceText} стр/день`].filter(Boolean).join('. '),
      onPress: onHistory ? () => onHistory(m.userId) : undefined,
      a11yHint: 'Открыть книги и историю',
    };
  });
  // «Ваше место» сразу по обоим рейтингам — как «Мой рейтинг» на экране челленджа.
  const myPages = data.me ? readingStandings(data.ranking, 'pages').find(r => r.member.userId === data.me!.userId)?.place : undefined;
  const myPace = data.me ? readingStandings(data.ranking, 'pace', protectPaceTop).find(r => r.member.userId === data.me!.userId)?.place : undefined;
  const num = { fontVariant: ['tabular-nums' as const] };
  return <Wrapper padding={16} gap={12}>
    {data.me && myPages && myPace ? <WashSurface testID="reading-my-place" radius={radius.block}>
      <View accessible accessibilityLabel={`Ваше место: по страницам ${myPages}, по среднему темпу ${myPace}. Участников: ${data.ranking.length}`}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, columnGap: 12 }}>
        <MemberAvatar name={data.me.name} avatar={data.me.avatar} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ty.headline, { color: T.label }]}>Ваше место</Text>
          <Text style={[ty.subhead, { color: T.labelSecondary }]}>Участников: {data.ranking.length}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[ty.title2, num, { color: T.label }]}>№{myPages}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>по страницам</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[ty.title2, num, { color: T.label }]}>№{myPace}</Text>
          <Text style={[ty.caption1, { color: T.labelSecondary }]}>по темпу</Text>
        </View>
      </View>
    </WashSurface> : null}
    {paceDaysLeft > 0 ? <InlineNotice message={`До допуска в топ-20 по среднему темпу: ${days(paceDaysLeft)} участия. Ваши страницы уже учитываются; место после допуска будет зависеть от среднего темпа.`} /> : null}
    <RankingCard caption={data.title} tabs={TABS} value={pagesFirst ? 0 : 1} onChange={index => setMetric(index === 0 ? 'pages' : 'pace')}>
      {rows.length
        ? <StandingsTable nameColumn="Участник" rows={rows} showMove showFlags={false} zoneAfter={!pagesFirst && protectPaceTop ? rows.filter(row => row.rank <= 20).length : 3}
            valueColumn={pagesFirst ? 'Стр.' : 'Стр/день'} secondaryColumn={pagesFirst ? 'Стр/день' : 'Стр.'} />
        : <Text style={[ty.subhead, { color: T.labelSecondary, textAlign: 'center', paddingVertical: 32, paddingHorizontal: 24 }]}>
            Пока никто не вступил. Первые участники появятся здесь.
          </Text>}
    </RankingCard>
    <ScreenDescription text="▲ / ▼ — изменение места относительно итогов вчера. Для страниц и среднего темпа сравнение отдельное." />
    <ScreenDescription text={metric === 'pace'
      ? `${protectPaceTop ? 'Топ-20 доступен с 7-го календарного дня участия. До этого результат виден ниже топ-20. Свободные места в топ-20 не заполняются новичками. ' : ''}Выше тот, кто читает больше страниц в среднем за день. При равном темпе — тот, кто участвует дольше.`
      : 'Выше тот, кто прочитал больше страниц за всё участие в этом челлендже. При равном количестве — выше средний темп, затем больше дней участия.'} />
    <ScreenDescription text={`Рейтинг доступен с первого дня. Всего страниц: подтверждённая сервером сумма по всем книгам за всё участие в этом челлендже, а не только за сегодня. Средний темп: все сохранённые страницы делятся на календарные дни участия, включая пропуски. Флаг ставится за день, когда к 00:00 по Алматы набрано меньше ${(data.targetMs ?? 3_600_000) / 60000} минут.${data.flagRecoveryDays ? ` За каждые ${data.flagRecoveryDays} дней подряд с выполненной нормой и сохранёнными страницами снимается один накопленный флаг. Здесь показаны оставшиеся флаги.` : ' Флаги накапливаются.'}${data.eliminationFlags ? ` Участник с ${data.eliminationFlags} красными флагами одновременно выбывает и не показывается в рейтинге, пока не начнёт заново.` : ''}`} />
  </Wrapper>;
}
