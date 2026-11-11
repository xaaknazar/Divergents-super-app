import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { BottomFade } from './BottomFade';
import { Wrapper } from './Wrapper';
import { TextSection } from './TextSection';
const meta = { title: 'Навигация/BottomFade', component: BottomFade,
  render: args => <Wrapper paddingTop={120} paddingBottom={120}><TextSection title="Плавная подложка" text="Содержимое растворяется под плавающими элементами." /><BottomFade {...args} /></Wrapper>,
} satisfies Meta<typeof BottomFade>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Composer: Story = { args: { placement: 'composer' } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
