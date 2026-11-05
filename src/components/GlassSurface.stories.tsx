import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Text } from 'react-native';
import { GlassSurface } from './GlassSurface';
const meta = { title: 'Atoms/GlassSurface', component: GlassSurface, args: {
  style: { height: 44, paddingHorizontal: 18, borderRadius: 22 },
  children: <Text>Стекло</Text>,
} } satisfies Meta<typeof GlassSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Capsule: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
