import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { Button } from './Button';
import { Wrapper } from './Wrapper';
const meta = { title: 'Основа/Wrapper', component: Wrapper,
  args: { dir: 'column', gap: 16 },
  render: args => <Wrapper {...args}><Button label="Продолжить" /><Button label="Отмена" variant="plain" /></Wrapper>,
} satisfies Meta<typeof Wrapper>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Column: Story = {};
export const Row: Story = {
  render: () => <Wrapper dir="row" gap={12}>
    <Wrapper flex={1}><Button label="Назад" variant="plain" /></Wrapper>
    <Wrapper flex={2}><Button label="Далее" /></Wrapper>
  </Wrapper>,
};
export const Dark: Story = { parameters: { scheme: 'dark' } };
