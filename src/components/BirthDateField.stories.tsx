import type { Meta, StoryObj } from '@storybook/react-native';

import { BirthDateField } from './BirthDateField';
const meta = { title: 'Liven/BirthDateField', component: BirthDateField, 
  args: { value: '01.01.1990', onChange: () => {}, placeholder: 'ДД.ММ.ГГГГ', accessibilityLabel: 'Дата рождения', label: 'Дата рождения', required: true },
} satisfies Meta<typeof BirthDateField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Error: Story = { args: { value: '', error: 'Укажите дату рождения' } };
