import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollHeader } from './ScrollHeader';
import { NavHeader } from './NavHeader';
const meta = { title: 'Навигация/ScrollHeader', component: ScrollHeader,
  args: { height: 110, onHeight: () => {}, children: <NavHeader title="Рейтинг" onBack={() => {}} /> },
} satisfies Meta<typeof ScrollHeader>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
export const Cover: StoryObj<typeof meta> = { args: { overCover: true } };
