// Чистая логика челленджевых ачивок — отдельно от хуков, чтобы тестировалась без RN.
import type { ChallengeHistoryItem } from './community';

/**
 * Челленджевые метрики с учётом ИСТОРИИ, а не только активного челленджа.
 *
 * Раньше всё бралось из активного челленджа: как только челлендж кончался,
 * активного больше не было — день, «финиш» и место обнулялись, и заработанные
 * «Финишер», «Неделя силы», «Топ-3» не выдавались (или пропадали). Прошлые
 * челленджи приходят из /api/mobile/me/challenges — берём максимум по ним и
 * по активному.
 */
export function challengeStats(
  history: ChallengeHistoryItem[],
  active: { currentDay: number; totalDays: number; myRank: number },
): { challengeDay: number; challengeFinished: number; challengeJoined: number; rankTop3: number } {
  let challengeDay = active.currentDay;
  let challengeFinished = active.totalDays > 0 && active.currentDay >= active.totalDays ? 1 : 0;
  let challengeJoined = active.currentDay > 0 ? 1 : 0;
  let rankTop3 = active.myRank > 0 && active.myRank <= 3 ? 1 : 0;

  for (const h of history) {
    if (h.status !== 'approved') continue;
    challengeJoined = 1;
    const r = h.result;
    // Дней в зачёте у человека: у выбывшего — до вылета, иначе — по календарю.
    const days = r ? r.judgedDays : Math.min(h.currentDay, h.durationDays || h.currentDay);
    challengeDay = Math.max(challengeDay, days);
    if (h.finished && r && !r.eliminated && !r.left) challengeFinished = 1;
    if (h.finished && r && r.teamRank > 0 && r.teamRank <= 3) rankTop3 = 1;
  }
  return { challengeDay, challengeFinished, challengeJoined, rankTop3 };
}
