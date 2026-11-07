import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { SeasonButton } from './SeasonButton';
import { ScreenDescription } from './ScreenDescription';
const meta = { title: 'Rankings/SeasonButton', component: SeasonButton, args: { season: 3, onPress: () => {} } } satisfies Meta<typeof SeasonButton>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
