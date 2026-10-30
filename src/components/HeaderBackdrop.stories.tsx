import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import { HeaderBackdrop,HeaderBackdropMotif } from './HeaderBackdrop';

function Canvas({ motif }: { motif: HeaderBackdropMotif }) {
  return <View style={{ height: 380 }}><HeaderBackdrop motif={motif} /></View>;
}
const meta = { title: 'Навигация/HeaderBackdrop', component: Canvas, args: { motif: 'learn' },
  argTypes: { motif: { control: 'select', options: ['learn', 'ai', 'community', 'profile'] } },
  parameters: { reduceTransparency: false },
} satisfies Meta<typeof Canvas>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Learn: Story = {};
export const AI: Story = { args: { motif: 'ai' } };
export const Community: Story = { args: { motif: 'community' } };
export const Profile: Story = { args: { motif: 'profile' } };
export const Dark: Story = { args: { motif: 'community' }, parameters: { scheme: 'dark', reduceTransparency: false } };
/** Reduce Transparency: только заливка, без рисунка. */
export const ReducedTransparency: Story = { args: { motif: 'learn' }, parameters: { reduceTransparency: true } };
export const LargeText: Story = { args: { motif: 'profile' }, parameters: { textSize: 'xl', reduceTransparency: false } };
