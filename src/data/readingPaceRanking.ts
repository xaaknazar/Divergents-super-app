/** Shared policy in mobile/server: calendar participation days include the joining day.
 * Only the first 20 pace positions are protected; everyone remains in the list.
 * Do not use readingDays, completedDays, flags or the retired review gate. */
export const READING_PACE_TOP_DAYS = 7;
export const READING_PACE_TOP_SIZE = 20;
export type PaceReader = { userId: string; averagePages?: number; daysParticipated?: number };
export function readingPaceTopDaysLeft(reader: PaceReader) {
  return Math.max(0, READING_PACE_TOP_DAYS - Math.max(0, Math.floor(reader.daysParticipated ?? 0)));
}
export function compareReadingPace(a: PaceReader, b: PaceReader) {
  return (b.averagePages ?? 0) - (a.averagePages ?? 0)
    || (b.daysParticipated ?? 0) - (a.daysParticipated ?? 0) || a.userId.localeCompare(b.userId);
}
export function protectedReadingPaceStandings<T extends PaceReader>(readers: readonly T[]) {
  const sorted = [...readers].sort(compareReadingPace);
  const top = sorted.filter(reader => readingPaceTopDaysLeft(reader) === 0).slice(0, READING_PACE_TOP_SIZE);
  const ids = new Set(top.map(reader => reader.userId));
  const rest = sorted.filter(reader => !ids.has(reader.userId));
  return [...top.map((member, i) => ({ member, place: i + 1 })),
    // Vacant protected places stay vacant, even with fewer than 20 qualified readers.
    ...rest.map((member, i) => ({ member, place: READING_PACE_TOP_SIZE + i + 1 }))];
}
