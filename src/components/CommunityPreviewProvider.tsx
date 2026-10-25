import React from 'react';
import type { Channel, ChannelPost } from '../data/channel';
import { DEFAULT_CHALLENGE } from '../data/community';
import { ChallengeStateContext } from '../state/ChallengeContext';
import { ChannelStateContext } from '../state/ChannelContext';
import { EnrollmentStateContext } from '../state/EnrollmentContext';
import { LanguageProvider } from '../state/LanguageContext';

/** Storybook-only fixtures: no auth, network requests or real participants. */
export function CommunityPreviewProvider({ children, participant = false, parallel = false, channels = [], posts = [], joined = [], unread = {} }: {
  children: React.ReactNode; participant?: boolean; parallel?: boolean;
  /** Каналы для превью списков; joined — где читатель участник, unread — новых по каналам. */
  channels?: Channel[]; posts?: ChannelPost[]; joined?: string[]; unread?: Record<string, number>;
}) {
  const first = { challenge: { ...DEFAULT_CHALLENGE, id: 'demo-challenge', title: 'Демо · 21 день движения', currentDay: 4, teamName: 'Демо-команда' },
    loading: false, error: false, isParticipant: participant, syncPending: false, syncError: null, dayLocked: false, canMark: false,
    setMetric: () => {}, toggleBinary: () => {}, refresh: async () => false, pointsToday: 20, bonusToday: 0,
    leaderboard: [], myRank: 0, teamPoints: 280, teamFlags: 0, teamPenalty: 0,
  };
  const second = { ...first, challenge: { ...first.challenge, id: 'demo-second', title: 'Демо · Второй активный челлендж', currentDay: 2 }, pointsToday: 40, teamPoints: 120 };
  const mine = participant ? (parallel ? [first, second] : [first]) : [];
  return <LanguageProvider><ChallengeStateContext.Provider value={{ ...first, activeChallenges: mine.map(v => v.challenge), byId: Object.fromEntries(mine.map(v => [v.challenge.id, v])) }}><EnrollmentStateContext.Provider value={{ ready: true, has: () => false, statusOf: () => null, isApproved: () => false,
    toggle: () => {}, add: () => {}, remove: () => {}, refresh: async () => {},
  }}><ChannelStateContext.Provider value={{ channels, loading: false, error: false, reload: () => {}, getChannel: id => channels.find(c => c.id === id),
    postsByChannel: id => posts.filter(p => p.channelId === id), getPost: id => posts.find(p => p.id === id),
    memberships: Object.fromEntries(joined.map(id => [id, 'subscribed'])), isJoined: id => joined.includes(id), join: async () => null,
    unread: id => unread[id] ?? 0, markSeen: () => {},
  }}>{children}</ChannelStateContext.Provider></EnrollmentStateContext.Provider></ChallengeStateContext.Provider></LanguageProvider>;
}
