import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { Button } from './Button';
import { StoryCanvas } from './StoryCanvas';
const meta = { title: 'Инструменты/StoryCanvas', component: StoryCanvas,
  args: { children: <Button label="Компонент на поверхности" /> },
} satisfies Meta<typeof StoryCanvas>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { args: { scheme: 'dark' } };
