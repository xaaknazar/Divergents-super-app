import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { NavBarLarge } from './NavBarLarge';
import { ProfileAvatarButton } from './ProfileAvatarButton';
const meta = { title: 'Навигация/NavBarLarge', component: NavBarLarge, args: { title: 'Обучение', trailing: <ProfileAvatarButton onPress={fn()} /> },
} satisfies Meta<typeof NavBarLarge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const LongTitle: Story = { args: { title: 'Мероприятия и спортивные активности' }, parameters: { textSize: 'xl', viewport: 'compact' } };
