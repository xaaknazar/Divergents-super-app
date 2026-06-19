import { SFName } from '../components/SFIcon';

export type NotifKind = 'challenge' | 'course' | 'community' | 'place' | 'career' | 'system';

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  date: string;
  icon: SFName;
  color: string;
}

export const KIND_META: Record<NotifKind, { icon: SFName; color: string }> = {
  challenge: { icon: 'flame.fill', color: '#FF3B30' },
  course:    { icon: 'book.fill', color: '#234088' },
  community: { icon: 'person.3.fill', color: '#3D5BDB' },
  place:     { icon: 'mappin.circle.fill', color: '#0EA5E9' },
  career:    { icon: 'briefcase.fill', color: '#16A34A' },
  system:    { icon: 'sparkles', color: '#AF52DE' },
};

const n = (id: string, kind: NotifKind, title: string, body: string, date: string): AppNotification =>
  ({ id, kind, title, body, date, icon: KIND_META[kind].icon, color: KIND_META[kind].color });

export const NOTIFICATIONS: AppNotification[] = [
  n('n1', 'challenge', 'Divergents challenge', 'День 12 — не забудь отметить шаги и чтение до 23:00.', 'Сегодня · 09:00'),
  n('n2', 'community', 'Лекция Дандай Амокачи', 'Сегодня в 19:00 — «Законы лидерства». LIVE.', 'Сегодня · 08:30'),
  n('n3', 'course', 'Новый урок', 'В курсе «Лидерство» добавлен урок «Законы лидерства 2».', 'Вчера'),
  n('n4', 'place', 'Место одобрено', '«Family Guest House» получил знак Divergents Approved.', '2 дня назад'),
  n('n5', 'career', 'Совпадение по талантам', 'Новая вакансия совпадает с вашими талантами на 92%.', '3 дня назад'),
  n('n6', 'system', 'Добро пожаловать', 'Заполните анкету Talentslab, чтобы открыть профиль талантов.', '5 дней назад'),
];
