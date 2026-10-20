export type OfflineKind = "trip" | "meetup" | "sport";

/** Render old ISO and new wall-clock timestamps in the event's timezone. */
export function formatEventDateTime(value: string): string {
  const localMs = eventStartMs(value);
  const ms = Number.isFinite(localMs) ? localMs : Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Date(ms).toLocaleString('ru-RU', {
    timeZone: 'Asia/Almaty', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }) + ' · UTC+5';
}

export function eventStartMs(value: unknown): number {
  if (typeof value !== "string") return NaN;
  const local = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!local) return NaN;
  const [, y, m, d, h, min] = local.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, h, min));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || h > 23 || min > 59) return NaN;
  return date.getTime() - 5 * 3600000;
}

/** Shared contract for new, free offline events. Legacy rows remain readable. */
export function validateOfflineEvent(kind: OfflineKind, b: any, now = Date.now()): string | null {
  const text = (v: unknown, min: number, max: number) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
  if (!text(b?.title, 2, 120)) return "Укажите название: от 2 до 120 символов";
  if (!text(b.city, 2, 100)) return "Укажите город";
  if (!text(b.description, 10, 5000)) return "Расскажите о встрече: от 10 до 5000 символов";
  if (!text(kind === "trip" ? b.meetPlace : b.place, 2, 300)) return "Укажите адрес или понятное место встречи";
  if (!Number.isInteger(b.spots) || b.spots < 1 || b.spots > 10000) return "Укажите количество участников: от 1 до 10 000";
  if (kind === "trip" && (!Number.isInteger(b.days) || b.days < 1 || b.days > 365)) return "Укажите длительность поездки: от 1 до 365 дней";
  const start = eventStartMs(b.meetAt);
  if (!Number.isFinite(start) || start <= now) return "Выберите будущую дату и время встречи (UTC+5)";
  if (typeof b.meetLat !== "number" || !Number.isFinite(b.meetLat) || Math.abs(b.meetLat) > 90 || typeof b.meetLng !== "number" || !Number.isFinite(b.meetLng) || Math.abs(b.meetLng) > 180) return "Отметьте место встречи на карте";
  return null;
}
