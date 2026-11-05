/** This is a typo prompt, not a reading-speed limit. The reader may confirm any valid count. */
export function unusualReadingPages(pages: number, minutes?: number) {
  return pages >= 200 || (minutes !== undefined && Number.isFinite(minutes) && minutes >= 0 && pages > Math.max(30, minutes * 3));
}

export function parseReadingPages(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const pages = Number(value);
  return Number.isSafeInteger(pages) && pages >= 0 && pages <= 10000 ? pages : null;
}

export function readingEntryDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
