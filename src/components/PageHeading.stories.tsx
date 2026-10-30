import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { PageHeading } from './PageHeading';

const meta = { title: 'Liven/Details/PageHeading', component: PageHeading, args: { title: 'Ваши усилия остаются с вами', description: 'История личных программ, достижения и настоящие результаты.', summary: 'Демо · 3 программы' },  } satisfies Meta<typeof PageHeading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
