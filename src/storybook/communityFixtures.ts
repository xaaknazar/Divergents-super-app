import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fn } from 'storybook/test';
import type { Channel, ChannelPost } from '../data/channel';
import type { ChallengeListItem,Meetup,SportActivity,Trip } from '../data/community';
import type { CommunityStackParams } from '../navigation/types';
export const navigation = { navigate: fn() } as unknown as NativeStackScreenProps<CommunityStackParams, 'CommunityHome'>['navigation'];
export const challenge: ChallengeListItem = { id: 'demo-challenge', title: 'Демо · 21 день движения', status: 'active', subtitle: 'Читаем, тренируемся и поддерживаем команду.',
  startLabel: '', durationDays: 21, maxFlags: 3, participants: 12, teams: 0, teamList: [], tint: '#234088', icon: 'flame.fill' };
export const trip: Trip = { id: 'demo-trip', title: 'Демо · Выходные в горах', region: 'Алматы', city: 'Алматы', date: '12 октября', meta: 'Лёгкий маршрут · 1 день', tint: '#234088', days: 1, going: 8, spots: 12,
  price: 'Бесплатно', difficulty: 'Начальный', organizer: 'Демо-организатор', organizerType: 'Участник', description: 'Демонстрационные данные', meetPlace: 'Место встречи', meetLat: null, meetLng: null, meetAt: '', itinerary: [], included: [] };
export const meetup: Meetup = { id: 'demo-meetup', title: 'Демо · Книжный клуб', description: 'Демонстрационные данные', date: '12 октября, 18:00', meetAt: '', place: 'Кофейня', city: 'Алматы', meetLat: null, meetLng: null, price: 'Бесплатно', spots: 12, going: 8, organizer: 'Демо-организатор', imageUrl: null, tint: '#234088' };
export const sport: SportActivity = { id: 'demo-sport', title: 'Демо · Утренняя пробежка', place: 'Парк', date: '13 октября, 07:00', icon: 'figure.run', going: 6, spots: 10, spotsLabel: '4 места', tint: '#234088' };
export const channel: Channel = { id: 'demo-channel', handle: 'demo', name: 'Демо · Новости сообщества', avatar: '', verified: true, baseSubscribers: 0, bio: 'Анонсы встреч и челленджей', access: 'open',
  memberCount: 1284, postCount: 12 };
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
/** Каналы для списков: подписка с новыми, подписка без новых, закрытый, открытый без картинки. */
export const channels: Channel[] = [
  { ...channel, id: 'c-book', name: 'Демо · Книжный клуб', avatar: 'https://picsum.photos/seed/divergents-books/400/400', verified: false, memberCount: 1284, postCount: 3,
    bio: 'Читаем вместе и разбираем книги месяца.' },
  { ...channel, id: 'c-lead', name: 'Демо · Лидерство', avatar: 'https://picsum.photos/seed/divergents-lead/400/400', verified: false, access: 'request', memberCount: 86, postCount: 12,
    bio: 'Закрытый канал программы лидерства: кейсы и задания.' },
  { ...channel, id: 'c-psy', name: 'Демо · Психометрика без мифов', avatar: '', verified: false, memberCount: 342, postCount: 1,
    bio: 'Как устроены тесты и что значит ваш профиль.' },
];
export const channelPosts: ChannelPost[] = [
  { id: 'p-1', channelId: 'c-book', type: 'article', title: 'Почему 20 минут в день лучше марафона', date: '2 ч назад', createdAt: ago(120), icon: 'doc.text.fill',
    body: ['Мозгу нужен ритм: короткая, но ежедневная сессия закрепляет навык и не выматывает.'], likes: 23, views: '0', readMins: 2 },
  { id: 'p-2', channelId: 'c-book', type: 'audio', title: 'Голосовое: итоги недели', date: '1 дн назад', createdAt: ago(60 * 26), icon: 'waveform', likes: 9, views: '0' },
];
