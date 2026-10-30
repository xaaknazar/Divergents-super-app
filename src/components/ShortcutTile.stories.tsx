import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { ShortcutTile } from './ShortcutTile';
import { Wrapper } from './Wrapper';

const meta = { title: 'Обучение/ShortcutTile', component: ShortcutTile,
  args: { icon: 'arrow.down.circle.fill', tone: 'brand', title: 'Скачанные', caption: 'Уроки без интернета', count: 3, onPress: fn() },
  argTypes: { tone: { control: 'select', options: ['brand', 'violet', 'orange', 'trip', 'pink'] } },
} satisfies Meta<typeof ShortcutTile>;
export default meta;
type Story = StoryObj<typeof meta>;
const Pair = () => <Wrapper dir="row" gap={12}>
  <Wrapper flex={1}><ShortcutTile icon="arrow.down.circle.fill" title="Скачанные" caption="Уроки без интернета" count={3} onPress={fn()} /></Wrapper>
  <Wrapper flex={1}><ShortcutTile icon="books.vertical.fill" tone="violet" title="Библиотека" caption="Книги и ИИ-советник" onPress={fn()} /></Wrapper>
</Wrapper>;
export const Downloads: Story = {};
export const LibraryNoCount: Story = { args: { icon: 'books.vertical.fill', tone: 'violet', title: 'Библиотека', caption: 'Книги и ИИ-советник', count: undefined } };
export const TwoColumns: Story = { render: () => <Pair /> };
export const Dark: Story = { render: () => <Pair />, parameters: { scheme: 'dark' } };
export const LargeText: Story = { render: () => <Pair />, parameters: { textSize: 'xl', viewport: 'compact' } };
