import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { HalfSheet } from './HalfSheet';
import { ScreenDescription } from './ScreenDescription';
const meta = { title: 'Overlays/HalfSheet', component: HalfSheet, args: { visible: true, title: 'Выберите сезон', onClose: () => {}, children: <ScreenDescription text="История челленджей" /> } } satisfies Meta<typeof HalfSheet>;
export default meta;
export const Default: StoryObj<typeof meta> = {};

export const Large: StoryObj<typeof meta> = { args: { size: 'large' } };
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
export const LargeText: StoryObj<typeof meta> = { parameters: { textSize: 'xl' } };
