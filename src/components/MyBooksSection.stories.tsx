import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { MyBookRow } from './MyBookRow';
import { MyBooksSection } from './MyBooksSection';
const meta = { title: 'Книги/MyBooksSection', component: MyBooksSection,
  args: { title: 'Читаю', count: 2, children: [
    <MyBookRow key="a" title="Атомные привычки" author="Джеймс Клир" detail="Reading · 96 стр. · 5 ч" read={false} onToggleRead={fn()} />,
    <MyBookRow key="b" title="Пять уровней лидерства" author="Джон Максвелл" detail="Читаю · 45%" read={false} onToggleRead={fn()} />] },
} satisfies Meta<typeof MyBooksSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
