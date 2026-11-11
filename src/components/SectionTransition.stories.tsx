import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { SectionTransition } from './SectionTransition';
import { SectionTabs } from './SectionTabs';
import { TextSection } from './TextSection';
const meta = { title: 'Навигация/SectionTransition', component: SectionTransition,
  parameters: { reduceMotion: false }, args: { value: 0, children: null },
  render: function Preview() { const [value, setValue] = useState(0);
    return <><SectionTabs items={[{ id: 0, label: 'Главная' }, { id: 1, label: 'Челленджи' }]} value={value} onChange={setValue} />
      <SectionTransition value={value}><TextSection title={value ? 'Челленджи' : 'Главная'} text="Контент меняется, панель сохраняет своё положение." /></SectionTransition></>;
  },
} satisfies Meta<typeof SectionTransition>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ReducedMotion: Story = { parameters: { reduceMotion: true } };
