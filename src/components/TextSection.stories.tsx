import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { TextSection } from './TextSection';

const meta = { title: 'Liven/Details/TextSection', component: TextSection, args: { title: 'Описание', text: 'Демонстрационный текст: небольшое ежедневное действие помогает продолжать выбранную программу.' },  } satisfies Meta<typeof TextSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Editorial: Story = { args: { title: 'Рецензия Divergents', variant: 'editorial' } };
