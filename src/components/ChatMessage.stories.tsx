import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChatMessage } from './ChatMessage';
const meta = { title: 'Компоненты/ChatMessage', component: ChatMessage,
  
  args: { role: 'bot', text: 'Демонстрация ответа ассистента. **Выберите курс**, чтобы начать обучение.', onCopy: fn() },
} satisfies Meta<typeof ChatMessage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
