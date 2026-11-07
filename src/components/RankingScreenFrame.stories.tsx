import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { RankingScreenFrame } from './RankingScreenFrame';
import { ScreenDescription } from './ScreenDescription';
const meta = { title: 'Rankings/RankingScreenFrame', component: RankingScreenFrame, args: { season: 3, onBack: () => {}, onSeason: () => {}, children: <ScreenDescription text="Рейтинг команд и участников" /> } } satisfies Meta<typeof RankingScreenFrame>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
