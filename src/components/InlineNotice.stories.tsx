import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { InlineNotice } from './InlineNotice';

const meta = { title: 'Liven/Details/InlineNotice', component: InlineNotice, args: { message: 'Не удалось обновить данные. Показаны ранее загруженные результаты.', onRetry: () => {} },  } satisfies Meta<typeof InlineNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Informational: Story = { args: { message: 'История хранится на этом устройстве.', onRetry: undefined } };
