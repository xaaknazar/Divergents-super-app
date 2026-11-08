import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ChallengeSeasonSheet } from './ChallengeSeasonSheet';
const meta = { title: 'Rankings/ChallengeSeasonSheet', component: ChallengeSeasonSheet, args: { visible: true, seasons: [{id: 'demo3', title: 'Divergents challenge: 3 season', season: 3, startISO: '2026-11-04', finished: false}, {id: 'demo2', title: 'Divergents challenge: 2 season', season: 2, startISO: '2026-10-04', finished: true, champion: { id: 'winner-demo', name: 'Команда чемпионов' }}], selected: 'demo3', loading: false, error: false, onRetry: () => {}, onClose: () => {}, onSelect: () => {} } } satisfies Meta<typeof ChallengeSeasonSheet>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };

export const LongChampion: StoryObj<typeof meta> = { args: { seasons: [{ id: 'demo2', title: 'Divergents challenge: 2 season', season: 2, startISO: '2026-10-04', finished: true, champion: { id: 'winner-demo', name: 'Команда с очень длинным названием победителя сезона' } }] }, parameters: { viewport: 'compact', textSize: 'xl' } };
