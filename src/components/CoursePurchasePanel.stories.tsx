import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CoursePurchasePanel } from './CoursePurchasePanel';
const meta = { title: 'Courses/Purchase', component: CoursePurchasePanel,
  args: { priceLabel: '4 000 ₸', phase: 'idle', message: null, canRestore: true,
    onBuy: () => {}, onRestore: () => {} } } satisfies Meta<typeof CoursePurchasePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const TestFlight: Story = { args: { testMode: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Confirming: Story = { args: { phase: 'confirming' } };
export const Pending: Story = { args: { phase: 'pending', message: 'Покупка ожидает подтверждения. Повторно платить не нужно.' } };
export const Error: Story = { args: { phase: 'error', message: 'Не удалось проверить покупки. Попробуйте ещё раз.' } };
