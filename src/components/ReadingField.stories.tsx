import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingField } from './ReadingField';
const meta = { title: 'Reading/Field', component: ReadingField,
  args: { label: 'Какую книгу читаете?', value: 'Атомные привычки', onChange: () => {} },
} satisfies Meta<typeof ReadingField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Book: Story = {};
export const Pages: Story = { args: { label: 'Страниц за подход', value: '22', kind: 'number' } };
export const Nickname: Story = { args: { label: 'Псевдоним капитана', value: 'Reader', kind: 'nickname' } };
export const Invalid: Story = { args: { value: '', error: 'Заполните это поле' } };
export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
