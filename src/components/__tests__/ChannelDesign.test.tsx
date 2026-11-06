import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChannelCard } from '../ChannelCard';
import { ChannelHero } from '../ChannelHero';
import { ChannelPostCard } from '../ChannelPostCard';
import { ChannelDetailView } from '../ChannelDetailView';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { channelDemo, channelDetailDemo, articleDemo, audioDemo, channelActions, channelViewActions } from '../../storybook/channelFixtures';

jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../GlassSurface', () => ({ GlassSurface: ({ children }: any) => children }));
jest.mock('../HeaderIcon', () => ({ HeaderIcon: () => null }));
jest.mock('../Segmented', () => ({ Segmented: ({ items, onChange }: any) => {
  const { Pressable, Text, View } = require('react-native');
  return <View>{items.map((label: string, i: number) => <Pressable key={label} accessibilityRole="radio" accessibilityLabel={label} onPress={() => onChange(i)}><Text>{label}</Text></Pressable>)}</View>;
} }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('../../state/LanguageContext', () => ({ tr: (text: string) => text }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
const frame = (children: React.ReactNode) => <ThemePreviewProvider>{children}</ThemePreviewProvider>;

test('pending discovery card opens the channel and does not pretend to send a new request', async () => {
  const onOpen = jest.fn();
  const v = await render(frame(<ChannelCard channel={{ ...channelDemo, access: 'request' }} postCount={2} membership="requested" onOpen={onOpen} />));
  expect(v.getByText('Запрос отправлен')).toBeTruthy();
  expect(v.getAllByRole('button')).toHaveLength(1);
  await fireEvent.press(v.getByRole('button'));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test.each(['approved', 'subscribed'])('membership %s is a status, never a second join action', async membership => {
  const onJoin = jest.fn();
  const v = await render(frame(<ChannelHero channel={channelDetailDemo} {...channelActions} membership={membership} onJoin={onJoin} />));
  expect(v.getByText('Вы подписаны')).toBeTruthy();
  expect(v.queryByRole('button', { name: 'Подписаться' })).toBeNull();
  expect(onJoin).not.toHaveBeenCalled();
});

test('private pending channel never renders the embedded posts', async () => {
  const v = await render(frame(<ChannelDetailView {...channelViewActions} channel={{ ...channelDetailDemo, access: 'request' }} membership="requested" />));
  expect(v.queryByText(articleDemo.title)).toBeNull();
  expect(v.queryByText(audioDemo.title)).toBeNull();
  expect(v.getByText('Запрос на рассмотрении')).toBeTruthy();
  expect(v.getByRole('button', { name: 'Запрос отправлен' }).props.accessibilityState.disabled).toBe(true);
});

test('approved private member can read and filter posts; deletion of final audio returns to all', async () => {
  const privateChannel = { ...channelDetailDemo, access: 'request' as const };
  const v = await render(frame(<ChannelDetailView {...channelViewActions} channel={privateChannel} membership="approved" />));
  expect(v.getByText(articleDemo.title)).toBeTruthy();
  await fireEvent.press(v.getByRole('button', { name: 'Поиск по каналу' }));
  await fireEvent.press(v.getByRole('radio', { name: 'Аудио' }));
  expect(v.queryByText(articleDemo.title)).toBeNull();
  expect(v.getByText(audioDemo.title)).toBeTruthy();
  await v.rerender(frame(<ChannelDetailView {...channelViewActions} channel={{ ...privateChannel, posts: [articleDemo] }} membership="approved" />));
  expect(v.getByText(articleDemo.title)).toBeTruthy();
});

test('owner has create, requests and manage; nonowner has none of those', async () => {
  const onRequests = jest.fn();
  const v = await render(frame(<ChannelHero channel={{ ...channelDetailDemo, access: 'request' }} {...channelActions} owner requestCount={3} onRequests={onRequests} />));
  await fireEvent.press(v.getByRole('button', { name: 'Заявки · 3' }));
  expect(onRequests).toHaveBeenCalledTimes(1);
  expect(v.getByRole('button', { name: 'Создать пост' })).toBeTruthy();
  expect(v.getByRole('button', { name: 'Управление' })).toBeTruthy();
  await v.rerender(frame(<ChannelHero channel={channelDetailDemo} {...channelActions} />));
  expect(v.queryByRole('button', { name: 'Создать пост' })).toBeNull();
  expect(v.queryByRole('button', { name: 'Управление' })).toBeNull();
});

test('post controls retain play, reaction and owner delete callbacks', async () => {
  const onPlay = jest.fn(), onReact = jest.fn(), onDelete = jest.fn();
  const props = { onPlay, onReact, onDelete };
  const v = await render(frame(<ChannelPostCard post={audioDemo} playing owner {...props} />));
  await fireEvent.press(v.getByRole('button', { name: 'Приостановить аудио' }));
  await fireEvent.press(v.getByRole('button', { name: 'Добавить реакцию' }));
  await fireEvent.press(v.getByRole('button', { name: 'Огонь' }));
  await fireEvent.press(v.getByRole('button', { name: 'Удалить публикацию' }));
  expect(onPlay).toHaveBeenCalledTimes(1); expect(onReact).toHaveBeenCalledWith('🔥'); expect(onDelete).toHaveBeenCalledTimes(1);
  await v.rerender(frame(<ChannelPostCard post={articleDemo} {...props} />));
  expect(v.getByText(articleDemo.body!)).toBeTruthy();
  expect(v.queryByRole('button', { name: 'Удалить публикацию' })).toBeNull();
});

test('missing channel offers retry and empty channel does not claim loading failed', async () => {
  const onRefresh = jest.fn();
  const v = await render(frame(<ChannelDetailView {...channelViewActions} channel={null} onRefresh={onRefresh} />));
  await fireEvent.press(v.getByRole('button', { name: 'Обновить' }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await v.rerender(frame(<ChannelDetailView {...channelViewActions} channel={{ ...channelDetailDemo, posts: [] }} />));
  expect(v.getByText('Здесь пока тихо')).toBeTruthy();
  expect(v.queryByText('Канал не найден')).toBeNull();
});


test('search can find body text and close restores all posts', async () => {
  const v = await render(frame(<ChannelDetailView {...channelViewActions} channel={channelDetailDemo} />));
  await fireEvent.press(v.getByRole('button', { name: 'Поиск по каналу' }));
  await fireEvent.changeText(v.getByLabelText('Поиск по публикациям'), 'запишите');
  expect(v.getByText(articleDemo.title)).toBeTruthy();
  expect(v.queryByText(audioDemo.title)).toBeNull();
  await fireEvent.press(v.getAllByRole('button', { name: 'Закрыть поиск' })[0]);
  expect(v.getByText(audioDemo.title)).toBeTruthy();
});

test('private discovery preview does not expose embedded post title', async () => {
  const v = await render(frame(<ChannelCard channel={{ ...channelDemo, access: 'request' }} postCount={2}
    latestTitle="Секретная публикация" onOpen={() => {}} />));
  expect(v.queryByText('Секретная публикация')).toBeNull();
});

test('channel information keeps management out of the reading feed', async () => {
  const v = await render(frame(<ChannelDetailView {...channelViewActions} channel={channelDetailDemo} owner />));
  expect(v.queryByRole('button', { name: 'Управление' })).toBeNull();
  await fireEvent.press(v.getByRole('button', { name: `О канале ${channelDetailDemo.name}` }));
  expect(v.getByRole('button', { name: 'Управление' })).toBeTruthy();
});
