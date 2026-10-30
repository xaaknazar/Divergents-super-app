import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { StyleSheet,View } from 'react-native';
import { CardMotif,CardMotifKind } from './CardMotif';

function Card({ kind }: { kind: CardMotifKind }) {
  return <View style={styles.card}><CardMotif kind={kind} /></View>;
}
const styles = StyleSheet.create({ card: { height: 170, borderRadius: 14, overflow: 'hidden' } });

const meta = { title: 'Сообщество/CardMotif', component: Card, args: { kind: 'trip' },
  argTypes: { kind: { control: 'select', options: ['challenge', 'challengeDark', 'trip', 'sport'] } },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Trip: Story = {};
export const Sport: Story = { args: { kind: 'sport' } };
export const Challenge: Story = { args: { kind: 'challenge' } };
export const ChallengeDark: Story = { args: { kind: 'challengeDark' } };
export const TripDark: Story = { parameters: { scheme: 'dark' } };
export const SportDark: Story = { args: { kind: 'sport' }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { kind: 'challenge' }, parameters: { textSize: 'xl' } };
