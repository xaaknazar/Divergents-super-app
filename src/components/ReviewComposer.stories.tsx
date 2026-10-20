import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ReviewComposer } from './ReviewComposer';

const meta = { title: 'Liven/Details/ReviewComposer', component: ReviewComposer, args: { value: 'Демонстрационная рецензия', kind: 'review', editing: false, sending: false, onChange: () => {}, onSend: () => {}, onCancelEdit: () => {} },  } satisfies Meta<typeof ReviewComposer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Editing: Story = { args: { editing: true } }; export const Sending: Story = { args: { sending: true } }; export const Empty: Story = { args: { value: '' } };
