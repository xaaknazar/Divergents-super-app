import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { MapSearchHeader } from './MapSearchHeader';
import { NavBarLarge } from './NavBarLarge';
import { ProfileAvatarButton } from './ProfileAvatarButton';
import { Wrapper } from './Wrapper';

const meta = { title: 'Навигация/ProfileAvatarButton', component: ProfileAvatarButton,
  args: { name: 'Акназар Ибраев', progress: 75, badge: 0, onPress: fn() },
  argTypes: { progress: { control: { type: 'range', min: 0, max: 100, step: 5 } } },
} satisfies Meta<typeof ProfileAvatarButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Initials: Story = {};
export const Complete: Story = { args: { progress: 100 } };
export const WithBadge: Story = { args: { badge: 3 } };
export const ManyEvents: Story = { args: { badge: 14, progress: 40 } };
export const NoName: Story = { args: { name: null, progress: 0 } };
export const Photo: Story = { args: { photoUrl: 'https://i.pravatar.cc/200?img=12', progress: 60, badge: 2 } };
export const GlassSurface: Story = { args: { badge: 1 }, parameters: { reduceTransparency: false } };
export const OpaqueSurface: Story = { args: { badge: 1 }, parameters: { reduceTransparency: true } };
export const Disabled: Story = { args: { onPress: undefined } };
export const Dark: Story = { args: { badge: 5 }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { badge: 12 }, parameters: { textSize: 'xl' } };
export const AllTabHeaders: Story = {
  render: args => <Wrapper gap={16}>
    {['Обучение', 'Divergents AI', 'Сообщество', 'Карьера'].map(title => <NavBarLarge key={title}
      title={title} trailing={<ProfileAvatarButton {...args} />} />)}
    <Wrapper paddingHorizontal={16}>
      <MapSearchHeader city="Алматы" country="Казахстан" cityPickerOpen={false} onChooseCity={fn()}
        searchValue="" searchPlaceholder="Поиск мест" onSearchChange={fn()}
        profile={args} onOpenProfile={args.onPress ?? fn()} />
    </Wrapper>
  </Wrapper>,
};
export const AllTabHeadersDark: Story = { ...AllTabHeaders, parameters: { scheme: 'dark' } };
export const CompactLargeTextHeaders: Story = { ...AllTabHeaders, parameters: { viewport: 'compact', textSize: 'xl' } };
