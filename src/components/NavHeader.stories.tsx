import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { HeaderIcon } from './HeaderIcon';
import { NavHeader } from './NavHeader';
const meta = { title: 'Навигация/NavHeader', component: NavHeader, args: { title: 'Программа тренировок', backLabel: 'Сообщество', onBack: fn(), safeArea: false, trailing: <HeaderIcon name="square.and.arrow.up" label="Поделиться" onPress={fn()} /> },
} satisfies Meta<typeof NavHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Plain: Story = { args: { variant: 'plain' } };
export const Frosted: Story = { args: { variant: 'frosted' }, parameters: { reduceTransparency: false } };
export const ReducedTransparency: Story = { args: { variant: 'frosted' } };
export const Hero: Story = { args: { variant: 'hero', trailing: undefined }, parameters: { scheme: 'dark' } };
export const Overlay: Story = { args: { variant: 'overlay', trailing: undefined } };
export const LargeTitle: Story = { args: { largeTitle: true, subtitle: 'Ваша активность и достижения за всё время' } };
export const NoBack: Story = { args: { onBack: undefined } };
