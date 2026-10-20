import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookRow } from './ReadingBookRow';
const meta = { title: 'Reading/Book row', component: ReadingBookRow,
  args: { title: 'Атомные привычки', author: 'Джеймс Клир', page: 128 } } satisfies Meta<typeof ReadingBookRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Card: Story = {};
export const WithChange: Story = { args: { onChange: () => {} } };
export const NoAuthor: Story = { args: { title: 'Мастер и Маргарита', author: null, page: 1 } };
export const Option: Story = { args: { variant: 'option', page: undefined } };
export const Dark: Story = { args: { onChange: () => {} }, parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
