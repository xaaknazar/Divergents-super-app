import { ReadingHistory } from './readingBooks';
import { fmtDecimal, fmtInt } from './format';
import { word } from './plural';
export function readingStatistics(history: ReadingHistory) {
  const m = history.reader;
  const days = m.history.filter(d => d.state !== 'future' && d.state !== 'excluded');
  const books = history.books.filter(b => b.elapsedMs > 0 || b.pages > 0);
  const finished = books.filter(b => b.finished);
  const bestDay = [...days].sort((a, b) => b.pages - a.pages || a.day - b.day)[0];
  const minutes = Math.floor(m.elapsedMs / 60000);
  const metrics = [
    { key: 'pages', label: 'страниц', value: fmtInt(m.pages) },
    { key: 'time', label: 'чтения', value: minutes >= 60 ? `${fmtDecimal(minutes / 60)} ч` : `${minutes} мин` },
    { key: 'books', label: word(finished.length, 'книга прочитана', 'книги прочитаны', 'книг прочитано'), value: String(finished.length) },
    { key: 'pace', label: 'страниц в день', value: fmtDecimal(m.averagePages ?? 0) },
    { key: 'streak', label: 'дней лучшая серия', value: String(m.bestStreak ?? 0) },
    { key: 'flags', label: word(m.flags, 'красный флаг', 'красных флага', 'красных флагов'), value: String(m.flags) },
  ];
  return { metrics, books, finished, bestDay, readingDays: m.readingDays ?? days.filter(d => d.elapsedMs > 0).length,
    completedDays: m.completedDays, forgivenFlags: m.flagRecovery?.forgivenFlags ?? 0,
    earnedFlags: m.flagRecovery?.earnedFlags ?? m.flags,
    completionRate: m.daysParticipated ? Math.round(m.completedDays / m.daysParticipated * 100) : 0,
    // Show actual saved days. No forecast or projected/fabricated reading.
    recent: days.slice(-7), period: m.period };
}
export const readingStatsDate = (ms: number) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'short', year: 'numeric' }).format(ms);
