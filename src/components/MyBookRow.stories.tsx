import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { MyBookRow } from './MyBookRow';
const meta = { title: 'Книги/MyBookRow', component: MyBookRow,
  args: { title: 'Атомные привычки', author: 'Джеймс Клир', detail: 'Reading · 96 стр. · 5 ч 12 мин', read: false, onPress: fn(), onToggleRead: fn() } } satisfies Meta<typeof MyBookRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Reading: Story = {};
export const Read: Story = { args: { read: true, detail: 'Прочитано' } };
export const Saving: Story = { args: { busy: true } };
export const Library: Story = { args: { detail: 'Читаю · 45%' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
