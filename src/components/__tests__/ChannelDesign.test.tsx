import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
import { ChannelHero } from '../ChannelHero';
import { ChannelPostCard } from '../ChannelPostCard';
import { ChannelReactions } from '../ChannelReactions';
import { CommunityChannelRow } from '../CommunityChannelRow';
import { CommunityChannelTile } from '../CommunityChannelTile';
import { channels } from '../../storybook/communityFixtures';

jest.mock('../../data/api', () => ({ API_BASE: 'https://example.test' }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('storybook/test', () => ({ fn: () => jest.fn() }), { virtual: true });
const wrap = (node: React.ReactElement) => render(<ThemePreviewProvider>{node}</ThemePreviewProvider>);
const hero = { name: 'Книжный клуб', handle: 'bookclub', bio: 'Читаем вместе.', access: 'open' as const, memberCount: 1284, postCount: 3 };

test('hero: one main action per role, counts without non-breaking spaces', async () => {
  const join = jest.fn();
  const guest = await wrap(<ChannelHero {...hero} role="guest" onJoin={join} />);
  expect(guest.getByLabelText('1 284 участника')).toBeTruthy();
  expect(JSON.stringify(guest.toJSON())).not.toMatch(/[  ]/);
  await fireEvent.press(guest.getByRole('button', { name: 'Вступить в канал' }));
  expect(join).toHaveBeenCalled();
  const closed = await wrap(<ChannelHero {...hero} access="request" role="guest" requested />);
  expect(closed.getByRole('button', { name: 'Запрос отправлен' })).toBeDisabled();
  const member = await wrap(<ChannelHero {...hero} role="member" />);
  expect(member.getByLabelText('Вы участник канала')).toBeTruthy();
  expect(member.queryByRole('button', { name: /Вступить/ })).toBeNull();
  const compose = jest.fn(), requests = jest.fn();
  const owner = await wrap(<ChannelHero {...hero} access="request" role="owner" pendingRequests={2} onCompose={compose} onRequests={requests} onSettings={jest.fn()} />);
  await fireEvent.press(owner.getByRole('button', { name: 'Новая публикация' }));
  await fireEvent.press(owner.getByRole('button', { name: 'Заявки · 2' }));
  expect([compose.mock.calls.length, requests.mock.calls.length]).toEqual([1, 1]);
});

test('reactions: only used ones are shown; the picker adds the rest and closes after a choice', async () => {
  const react = jest.fn();
  const view = await wrap(<ChannelReactions options={['👍', '❤️', '🔥']} counts={{ '👍': 2 }} mine={null} onReact={react} />);
  expect(view.queryByLabelText('Поставить 🔥')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Поставить реакцию' }));
  await fireEvent.press(view.getByRole('button', { name: 'Поставить 🔥' }));
  expect(react).toHaveBeenCalledWith('🔥');
  expect(view.queryByLabelText('Поставить 🔥')).toBeNull();
});

test('post: long text folds, the owner menu exists only for the owner', async () => {
  const post = { id: 'p', type: 'article' as const, title: 'Заголовок', body: 'слово '.repeat(80), createdAt: new Date().toISOString() };
  const toggle = jest.fn();
  const reader = await wrap(<ChannelPostCard post={post} reactionOptions={['👍']} onReact={jest.fn()} onToggleExpanded={toggle} />);
  await fireEvent.press(reader.getByRole('button', { name: 'Читать далее' }));
  expect(toggle).toHaveBeenCalled();
  expect(reader.queryByLabelText('Действия с публикацией')).toBeNull();
  const owner = await wrap(<ChannelPostCard post={post} reactionOptions={['👍']} onReact={jest.fn()} onMore={jest.fn()} />);
  expect(owner.getByLabelText('Действия с публикацией')).toBeTruthy();
});

test('community: a member row shows the latest post and the unread count; a guest row shows counts', async () => {
  const member = await wrap(<CommunityChannelRow channel={channels[0]} joined unread={3} onPress={jest.fn()}
    latest={{ title: 'Почему 20 минут', type: 'article', timeLabel: '2 ч назад' }} />);
  expect(member.getByText('Почему 20 минут')).toBeTruthy();
  expect(member.getByText('3')).toBeTruthy();
  const guest = await wrap(<CommunityChannelRow channel={channels[1]} joined={false} onPress={jest.fn()} />);
  expect(guest.getByText('86 участников · 12 публикаций')).toBeTruthy();
  expect(guest.getByRole('button').props.accessibilityLabel).toMatch(/закрытый канал/);
  const tile = await wrap(<CommunityChannelTile channel={channels[0]} joined unread={2} onPress={jest.fn()} />);
  expect(tile.getByText('2 новые')).toBeTruthy();
});
