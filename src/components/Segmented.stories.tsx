import type { Meta,StoryObj } from '@storybook/react-native';
import React,{ useState } from 'react';
import { fn } from 'storybook/test';
import { Segmented } from './Segmented';

const meta = {
  title: 'Выбор/Segmented', component: Segmented,
  args: { items: ['Все', 'Мои', 'Завершённые'], value: 0, onChange: fn() },
} satisfies Meta<typeof Segmented>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = { render: function InteractiveStory(args) {
  const [value, setValue] = useState(args.value);
  return <Segmented {...args} value={value} onChange={next => { setValue(next); args.onChange?.(next); }} />;
} };
export const ReadOnly: Story = { args: { onChange: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
