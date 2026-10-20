import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { Button } from './Button';
import { ThemePreviewProvider } from './ThemePreviewProvider';
const meta = { title: 'Инструменты/ThemePreviewProvider', component: ThemePreviewProvider,
  args: { children: <Button label="Предпросмотр темы" /> },
} satisfies Meta<typeof ThemePreviewProvider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = { args: { scheme: 'light' } };
export const Dark: Story = { args: { scheme: 'dark' } };
