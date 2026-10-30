import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { IconTile,IconTileTone } from './IconTile';
import { Wrapper } from './Wrapper';

const TONES: IconTileTone[] = ['brand', 'challenge', 'trip', 'sport', 'violet', 'orange', 'pink', 'neutral'];
const meta = { title: 'Основа/IconTile', component: IconTile,
  args: { icon: 'flame.fill', tone: 'brand', variant: 'solid', size: 'md' }, argTypes: {
    tone: { control: 'select', options: TONES },
    variant: { control: 'select', options: ['solid', 'soft'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof IconTile>;
export default meta;
type Story = StoryObj<typeof meta>;

const Palette = ({ variant }: { variant: 'solid' | 'soft' }) => <Wrapper dir="row" gap={8} wrap>
  {TONES.map(tone => <IconTile key={tone} tone={tone} variant={variant} icon="figure.run" />)}
</Wrapper>;

export const Solid: Story = {};
export const Soft: Story = { args: { variant: 'soft', icon: 'target' } };
export const Sizes: Story = { render: args => <Wrapper dir="row" gap={12} align="center">
  <IconTile {...args} size="sm" /><IconTile {...args} size="md" /><IconTile {...args} size="lg" />
</Wrapper> };
export const SolidPalette: Story = { render: () => <Palette variant="solid" /> };
export const SoftPalette: Story = { render: () => <Palette variant="soft" /> };
export const DarkSolid: Story = { render: () => <Palette variant="solid" />, parameters: { scheme: 'dark' } };
export const DarkSoft: Story = { render: () => <Palette variant="soft" />, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { size: 'lg', tone: 'trip', icon: 'mountain.2.fill' }, parameters: { textSize: 'xl' } };
