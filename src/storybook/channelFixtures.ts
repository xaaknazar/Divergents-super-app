import type { ServerChannel, ServerChannelPost } from '../data/api';
import type { Channel } from '../data/channel';

/** Illustrative content only, never imported by the application. */
export const channelDemo: Channel = {
  id: 'preview-channel', handle: 'danday', name: 'Danday Amokachi',
  avatar: 'https://utfs.io/f/b51d2a3c-8a0a-4714-9dec-b52a29c35adb-n92lk7.jpg',
  bio: 'Про развитие, книги и маленькие шаги к большим переменам.',
  access: 'open', verified: false, baseSubscribers: 0,
};
export const articleDemo: ServerChannelPost = {
  id: 'preview-article', type: 'article', title: 'Маленькие шаги, которые меняют день',
  body: 'Начните с одной простой привычки. Прочитайте несколько страниц, запишите важную мысль и попробуйте применить её сегодня.\n\nНе обязательно делать всё сразу. Когда действие становится привычным, к нему легче добавить следующее. Отмечайте не только результат, но и то, что помогло вам двигаться дальше.\n\nКакая привычка помогает вам сейчас?',
  createdAt: '2026-11-06T07:30:00Z', reactions: { '❤️': 12, '🔥': 4 }, myReaction: '❤️',
};
export const audioDemo: ServerChannelPost = {
  id: 'preview-audio', type: 'audio', title: 'Мысль на сегодня: внимание к себе',
  audioUrl: 'https://example.invalid/preview-only.m4a', createdAt: '2026-11-05T12:00:00Z', reactions: { '👍': 3 },
};
export const channelDetailDemo: ServerChannel = {
  id: channelDemo.id, name: channelDemo.name, handle: channelDemo.handle, bio: channelDemo.bio,
  avatarUrl: channelDemo.avatar, access: 'open', posts: [articleDemo, audioDemo], _count: { posts: 2, members: 128 },
};
export const channelActions = { onJoin: () => {}, onCreatePost: () => {}, onRequests: () => {}, onManage: () => {} };
export const channelViewActions = { ...channelActions, onBack: () => {}, onModerate: () => {}, onRefresh: () => {}, onPlay: () => {}, onReact: () => {}, onDeletePost: () => {} };
