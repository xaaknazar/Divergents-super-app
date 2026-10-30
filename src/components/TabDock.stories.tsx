import type { Meta,StoryObj } from '@storybook/react-native';
import React, { useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { demoBook, demoProgram, demoProgramStats } from '../storybook/livenFixtures';
import { BookCard } from './BookCard';
import { ProgramHistoryCard } from './ProgramHistoryCard';
import { Screen } from './Screen';
import { TextSection } from './TextSection';
import { Wrapper } from './Wrapper';
import { TabDock } from './TabDock';
const meta = { title: 'Навигация/TabDock', component: TabDock,
  parameters: { canvasLayout: 'screen', reduceTransparency: false },
  render: function Preview(args) {
    const [selected, setSelected] = useState(args.items.find(item => item.selected)?.id);
    useEffect(() => { setSelected(args.items.find(item => item.selected)?.id); }, [args.items]);
    return <Wrapper flex={1}>
      <Screen topInset={false}>
        <Wrapper padding={16} gap={16}>
          <TextSection title="Навигация Divergents" text="Приподнятая стеклянная панель: прежние пять вкладок и иконки, скруглённый контур и отдельное выделение выбранного раздела. Демонстрационные данные." />
          <BookCard book={demoBook} variant="shelf" progress={35} onPress={fn()} />
          <ProgramHistoryCard program={demoProgram} stats={demoProgramStats} onPress={fn()} />
          <BookCard book={demoBook} onPress={fn()} />
        </Wrapper>
      </Screen>
      <TabDock {...args} items={args.items.map(item => ({ ...item, selected: item.id === selected }))}
        onSelect={id => { setSelected(id); args.onSelect(id); }} />
    </Wrapper>;
  },
  args: { onSelect: fn(), onLongPress: fn(), items: [
    { id: 'learn', label: 'Обучение', shortLabel: 'Курсы', icon: 'book.fill', selected: true },
    { id: 'ai', label: 'AI', icon: 'sparkles.outline', selected: false },
    { id: 'community', label: 'Сообщество', shortLabel: 'Клуб', icon: 'person.3', selected: false },
    { id: 'map', label: 'Карта', icon: 'map', selected: false },
    { id: 'career', label: 'Карьера', shortLabel: 'Работа', icon: 'briefcase', selected: false },
  ] },
} satisfies Meta<typeof TabDock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };
export const DarkReducedTransparency: Story = { parameters: { scheme: 'dark', reduceTransparency: true } };
export const FewerDestinations: Story = { args: { items: meta.args.items.filter(item => item.id === 'learn' || item.id === 'community') } };
export const CommunitySelected: Story = { args: { items: meta.args.items.map(item => ({ ...item,
  selected: item.id === 'community', icon: item.id === 'learn' ? 'book' : item.id === 'community' ? 'person.3.fill' : item.icon })) } };
