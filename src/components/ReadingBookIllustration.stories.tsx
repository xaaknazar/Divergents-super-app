import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingBookIllustration } from './ReadingBookIllustration';

const meta = { title: 'Reading/Book illustration', component: ReadingBookIllustration } satisfies Meta<typeof ReadingBookIllustration>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Card: Story = {};
export const Header: Story = { args: { placement: 'header' } };
export const Dark: Story = { args: { placement: 'header' }, parameters: { scheme: 'dark' } };
