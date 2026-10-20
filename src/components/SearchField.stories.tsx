import type { Meta,StoryObj } from '@storybook/react-native';
import React,{ useState } from 'react';
import { fn } from 'storybook/test';
import { SearchField } from './SearchField';
const meta = { title: 'Основа/SearchField', component: SearchField,
  args: { value: '', placeholder: 'Поиск курса', onChangeText: fn() },
  render: function Editable(args) {
    const [value, setValue] = useState(args.value);
    return <SearchField {...args} value={value} onChangeText={next => { setValue(next); args.onChangeText(next); }} />;
  },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = { args: { value: 'Привычки' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
