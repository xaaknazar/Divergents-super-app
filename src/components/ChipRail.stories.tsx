import type { Meta,StoryObj } from '@storybook/react-native';
import React,{ useState } from 'react';
import { CATEGORIES, CATEGORY_META, TAGS, TAG_META } from '../data/places';
import { ChipRail } from './ChipRail';

const LABELS = ['Все', 'Лидерство', 'Привычки', 'Психология', 'Карьера', 'Финансы', 'Отношения', 'Здоровье'];
const COMMUNITY = ['Главное', 'Каналы', 'Челленджи', 'Поездки', 'Мероприятия', 'Спорт'];
function Demo({ initial, section = 'learning' }: { initial: string; section?: 'learning' | 'community' }) {
  const [value, setValue] = useState(initial);
  return <ChipRail inset={section === 'community' ? 'none' : 'page'} overflowHint={section === 'community'}
    itemRole={section === 'community' ? 'tab' : 'button'}
    items={(section === 'community' ? COMMUNITY : LABELS).map(label => ({
      key: label, label, active: label === value, onPress: () => setValue(label),
    }))} />;
}
function MapDemo() {
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  return <ChipRail inset="compact" overflowHint items={[
    { key: 'all', label: 'Все', active: !category, onPress: () => setCategory(null) },
    ...CATEGORIES.map(key => ({ key: `cat-${key}`, label: CATEGORY_META[key].label, active: category === key,
      onPress: () => setCategory(category === key ? null : key) })),
    ...TAGS.map(key => ({ key: `tag-${key}`, label: TAG_META[key].label, active: tags.includes(key),
      onPress: () => setTags(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key]) })),
  ]} />;
}
const meta = { title: 'Основа/ChipRail', component: Demo, args: { initial: 'Все' } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
/** Выбран пункт за правым краем — строка прокручивается к нему при открытии. */
export const SelectedOffscreen: Story = { args: { initial: 'Здоровье' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { args: { initial: 'Финансы' }, parameters: { textSize: 'xl', viewport: 'compact' } };
export const Community: Story = { args: { initial: 'Главное', section: 'community' } };
export const CommunityDark: Story = { ...Community, parameters: { scheme: 'dark' } };
export const CommunityLastSelected: Story = { args: { initial: 'Спорт', section: 'community' } };
export const CommunityLargeText: Story = { ...Community, parameters: { textSize: 'xl', viewport: 'compact' } };
export const MapFilters: Story = { render: () => <MapDemo /> };
export const MapFiltersDark: Story = { ...MapFilters, parameters: { scheme: 'dark' } };
export const MapFiltersLargeText: Story = { ...MapFilters, parameters: { textSize: 'xl', viewport: 'compact' } };
