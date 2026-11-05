// Строки рейтинга челленджа для таблицы StandingsTable: команды и участники,
// за весь челлендж и за сегодня. Отдельный модуль — чтобы правила порядка
// можно было проверить тестом без экрана и контекста.
import React from 'react';
import { rankChangeOf, shortPersonName, StandingRow } from './StandingsTable';
import { TodayGoals } from './ChallengeRanking';
import { tr } from '../state/LanguageContext';
import { totalFlags, MemberTaskProgress, OverallStanding, ResultsTeamRow, TeamStanding } from '../data/community';

export function teamRows(teams: ReadonlyArray<TeamStanding | ResultsTeamRow>): StandingRow[] {
  return teams.map((t) => ({
    id: t.id, rank: t.rank, name: t.name,
    change: rankChangeOf(t as TeamStanding),
    flags: (t as TeamStanding).flags ?? 0,
    points: t.points, isMine: t.isMine,
  }));
}

export function memberRows(members: ReadonlyArray<OverallStanding>): StandingRow[] {
  return members.map((m) => ({
    id: m.id, rank: m.rank, name: shortPersonName(m.name), fullName: m.name,
    // Вышел по белому флагу и выбыл — разные вещи: первое разрешил капитан,
    // второе человек заработал сам.
    subtitle: [m.teamName || tr('без команды'), m.left ? `🏳️ ${tr('вышел')}` : m.eliminated ? tr('выбыл') : ''].filter(Boolean).join(' · '),
    avatar: { uri: m.avatar, eliminated: m.eliminated, left: m.left === true },
    change: rankChangeOf(m),
    flags: totalFlags(m.flags),
    points: m.points, isMine: m.isMe,
    dimmed: m.eliminated || m.left === true,
  }));
}

/** Команды за сегодня: сумма дневных очков участников. При равенстве — общий порядок. */
export function teamTodayRows(teams: ReadonlyArray<TeamStanding>, members: ReadonlyArray<OverallStanding>): StandingRow[] {
  const today = new Map<string, number>();
  for (const m of members) if (m.teamId) today.set(m.teamId, (today.get(m.teamId) ?? 0) + m.day);
  return [...teams]
    .sort((a, b) => (today.get(b.id) ?? 0) - (today.get(a.id) ?? 0) || a.rank - b.rank)
    .map((t, i) => ({ id: t.id, rank: i + 1, name: t.name, change: null, flags: t.flags ?? 0,
      points: today.get(t.id) ?? 0, value: `+${today.get(t.id) ?? 0}`, isMine: t.isMine }));
}

/**
 * Участники за сегодня — тот же порядок, что в карточке команды и на сайте:
 * очки за день, затем число выполненных целей, затем имя. Цели известны только
 * для своей команды — у остальных под именем команда.
 */
export function memberTodayRows(members: ReadonlyArray<OverallStanding>, tasks: ReadonlyMap<string, MemberTaskProgress[]>): StandingRow[] {
  const done = (id: string) => (tasks.get(id) ?? []).filter((t) => t.completed).length;
  return [...members]
    .sort((a, b) => b.day - a.day || done(b.id) - done(a.id) || a.name.localeCompare(b.name, 'ru'))
    .map((m, i) => {
      const goals = tasks.get(m.id);
      return {
        id: m.id, rank: i + 1, name: shortPersonName(m.name), fullName: m.name,
        subtitle: goals?.length ? undefined : m.teamName || tr('без команды'),
        detail: goals?.length ? <TodayGoals tasks={goals} /> : undefined,
        avatar: { uri: m.avatar, eliminated: m.eliminated, left: m.left === true },
        change: null, flags: totalFlags(m.flags), points: m.day, value: `+${m.day}`,
        isMine: m.isMe, dimmed: m.eliminated || m.left === true,
      };
    });
}
