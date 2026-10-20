import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingStartDateField } from './ReadingStartDateField';
import { nextReadingDate } from '../data/readingCreation';
const meta = { title: 'Reading/StartDate', component: ReadingStartDateField,
  args: { value: nextReadingDate(), onChange: () => {} },
} satisfies Meta<typeof ReadingStartDateField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const Error: Story = { args: { error: 'Выберите будущую дату старта' } };
export const Disabled: Story = { args: { disabled: true } };
