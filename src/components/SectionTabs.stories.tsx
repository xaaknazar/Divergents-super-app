import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { SectionTabs } from './SectionTabs';
const meta = { title: 'Навигация/SectionTabs', component: SectionTabs,
  parameters: { reduceTransparency: false },
  args: { items: [{ id: 0, label: 'Главное' }, { id: 1, label: 'Каналы' }, { id: 2, label: 'Челленджи' }, { id: 3, label: 'Поездки' }, { id: 4, label: 'Мероприятия' }, { id: 5, label: 'Спорт' }], value: 0, onChange: () => {} },
} satisfies Meta<typeof SectionTabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const LastSectionSelected: Story = { args: { value: 5 } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
export const ReadingRankings: Story = { args: { items: [{ id: 0, label: 'Команды' }, { id: 1, label: 'Участники' }] } };
export const Interactive: Story = { render: function Render(args) { const [value, setValue] = useState(args.value); return <SectionTabs {...args} value={value} onChange={setValue} />; } };
