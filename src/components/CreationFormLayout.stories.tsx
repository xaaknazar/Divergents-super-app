import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CreationFormLayout } from './CreationFormLayout';
import { CreationField } from './CreationField';
import { CreationTextInput } from './CreationTextInput';
const meta = { title: 'Создание/CreationFormLayout', component: CreationFormLayout,
  parameters: { canvasLayout: 'screen' }, args: { onCancel: () => {}, onSubmit: () => {},
    children: <CreationField label="Название"><CreationTextInput label="Название" value="Книжный клуб" onChange={() => {}} /></CreationField> },
} satisfies Meta<typeof CreationFormLayout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Publishing: Story = { args: { busy: true } };
export const Error: Story = { args: { error: 'Проверьте дату старта' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
