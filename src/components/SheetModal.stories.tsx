import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Text } from 'react-native';
import { fn } from 'storybook/test';
import { SheetModal } from './SheetModal';
const meta = { title: 'Основа/SheetModal', component: SheetModal,
  args: { visible: true, title: 'Заявки на вступление', onClose: fn(), children: <Text>Содержимое листа</Text> } } satisfies Meta<typeof SheetModal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Regular: Story = {};
export const Tall: Story = { args: { tall: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
