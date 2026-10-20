import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CreationField } from './CreationField';
import { CreationTextInput } from './CreationTextInput';
const meta = { title: 'Создание/CreationField', component: CreationField,
  args: { label: 'Название', children: <CreationTextInput label="Название" value="Книжный клуб" onChange={() => {}} /> },
} satisfies Meta<typeof CreationField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Error: Story = { args: { error: 'Укажите название' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
