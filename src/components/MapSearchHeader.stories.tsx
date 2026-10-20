import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { MapSearchHeader } from './MapSearchHeader';

const meta = {
  title: 'Карта/MapSearchHeader', component: MapSearchHeader,
  args: {
    city: 'Алматы', country: 'Казахстан', cityPickerOpen: false, onChooseCity: fn(),
    searchValue: '', onSearchChange: fn(), searchPlaceholder: 'Поиск мест и адресов',
    profile: { name: 'Демо пользователь', progress: 75 }, onOpenProfile: fn(),
  },
  render: function Preview(args) {
    const [value, setValue] = useState(args.searchValue);
    return <MapSearchHeader {...args} searchValue={value}
      onSearchChange={next => { setValue(next); args.onSearchChange(next); }} />;
  },
} satisfies Meta<typeof MapSearchHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LongCity: Story = { args: { city: 'Усть-Каменогорск' }, parameters: { viewport: 'compact' } };
export const LargeText: Story = { ...LongCity, parameters: { viewport: 'compact', textSize: 'xl' } };
export const LargeTextDark: Story = { ...LongCity, parameters: { viewport: 'compact', textSize: 'xl', scheme: 'dark' } };
export const Search: Story = { args: { searchValue: 'Парк' } };
