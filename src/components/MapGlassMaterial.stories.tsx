import React from 'react';
import { Text, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { MapGlassMaterial } from './MapGlassMaterial';
const meta = { title: 'Карта/MapGlassMaterial', component: MapGlassMaterial,
  args: { role: 'city' }, parameters: { reduceTransparency: false },
  render: args => <View style={{ minHeight: 52, borderRadius: 999, justifyContent: 'center', alignItems: 'center' }}>
    <MapGlassMaterial {...args} /><Text style={{ color: args.role === 'search' || args.role === 'control' ? '#182843' : '#FFFFFF' }}>Стекло карты</Text>
  </View>,
} satisfies Meta<typeof MapGlassMaterial>;
export default meta;
type Story = StoryObj<typeof meta>;
export const City: Story = {};
export const Search: Story = { args: { role: 'search' } };
export const Selected: Story = { args: { role: 'selected' } };
export const Control: Story = { args: { role: 'control' } };
export const DarkFilter: Story = { args: { role: 'filter' }, parameters: { scheme: 'dark', reduceTransparency: false } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
