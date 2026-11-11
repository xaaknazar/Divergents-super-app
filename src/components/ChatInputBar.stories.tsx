import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { ChatInputBar } from './ChatInputBar';
import { ChatComposer } from './ChatComposer';
import { Wrapper } from './Wrapper';
const meta = { title: 'ИИ/ChatInputBar', component: ChatInputBar, parameters: { canvasLayout: 'screen' }, args: { children: null },
  render: function Preview(args) { const [value, setValue] = useState('');
    return <Wrapper flex={1}><ChatInputBar {...args}><ChatComposer value={value} onChangeText={setValue} onSend={() => setValue('')}
      disabled={false} busy={false} placeholder="Спросите ассистента…" /></ChatInputBar></Wrapper>;
  },
} satisfies Meta<typeof ChatInputBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const Keyboard: Story = { args: { keyboardVisible: true } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
