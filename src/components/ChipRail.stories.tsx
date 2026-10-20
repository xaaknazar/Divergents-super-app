import type { Meta,StoryObj } from '@storybook/react-native';
import React,{ useState } from 'react';
import { ChipRail } from './ChipRail';

const LABELS = ['Все', 'Лидерство', 'Привычки', 'Психология', 'Карьера', 'Финансы', 'Отношения', 'Здоровье'];
function Demo({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <ChipRail items={LABELS.map(label => ({ key: label, label, active: label === value, onPress: () => setValue(label) }))} />;
}
const meta = { title: 'Основа/ChipRail', component: Demo, args: { initial: 'Все' } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
/** Выбран пункт за правым краем — строка прокручивается к нему при открытии. */
export const SelectedOffscreen: Story = { args: { initial: 'Здоровье' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { initial: 'Финансы' }, parameters: { textSize: 'xl', viewport: 'compact' } };
