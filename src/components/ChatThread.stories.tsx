import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ChatThread } from './ChatThread';

const meta = { title: 'Liven/Details/ChatThread', component: ChatThread, args: { messages: [], busy: false, title: 'Книжный советник', description: 'Демо · Подбор книг для выбранной цели' }, parameters: { canvasLayout: 'screen' }, } satisfies Meta<typeof ChatThread>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Tablet: Story = { parameters: { viewport: 'tablet' } };
export const Conversation: Story = { args: { messages: [{ id: '1', role: 'user', text: 'Что почитать?' }, { id: '2', role: 'bot', text: 'Демонстрационный ответ. **Книги** появятся в разговоре.' }] } }; export const Waiting: Story = { args: { busy: true } };
