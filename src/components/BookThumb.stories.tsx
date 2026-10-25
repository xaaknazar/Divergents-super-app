import type { Meta, StoryObj } from '@storybook/react-native';
import { BookThumb } from './BookThumb';
const meta = { title: 'Книги/BookThumb', component: BookThumb, args: { uri: null } } satisfies Meta<typeof BookThumb>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Placeholder: Story = {};
export const Cover: Story = { args: { uri: 'https://covers.openlibrary.org/b/id/12539702-M.jpg' } };
export const Small: Story = { args: { size: 'small' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
