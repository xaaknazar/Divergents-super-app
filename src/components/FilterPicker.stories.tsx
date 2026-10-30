import type { Meta,StoryObj } from '@storybook/react-native';
import React,{ useState } from 'react';
import { fn } from 'storybook/test';
import { FilterPicker } from './FilterPicker';
const meta = { title: 'Основа/FilterPicker', component: FilterPicker,
  args: { label: 'Категория', items: ['Все', 'Саморазвитие', 'Продуктивность', 'Эмоциональное благополучие'], value: 'Все', onChange: fn() },
  render: function Selectable(args) {
    const [value, setValue] = useState(args.value);
    return <FilterPicker {...args} value={value} onChange={next => { setValue(next); args.onChange(next); }} />;
  },
} satisfies Meta<typeof FilterPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = { args: { value: 'Саморазвитие' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
