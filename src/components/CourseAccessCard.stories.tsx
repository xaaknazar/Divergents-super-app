import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { CourseAccessCard } from './CourseAccessCard';

const meta = { title: 'Liven/Details/CourseAccessCard', component: CourseAccessCard, args: { gifted: false, canBuy: false, price: 15000 },  } satisfies Meta<typeof CourseAccessCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Gift: Story = { args: { gifted: true } }; export const PurchasesEnabled: Story = { args: { canBuy: true } };
