import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { ColorWash, WashSurface } from './ColorWash';

function Demo() {
  return <View style={{ height: 420 }}>
    <ColorWash />
    <View style={{ padding: 16, paddingTop: 120 }}>
      <WashSurface radius={26}><Text style={{ padding: 24 }}>Карточка поверх цветного фона</Text></WashSurface>
    </View>
  </View>;
}

const meta = {
  title: 'Фон/ColorWash', component: Demo,
  parameters: { layout: 'screen' },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ByAccent: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
