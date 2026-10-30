import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChatSuggestions } from './ChatSuggestions';
const meta = { title: 'Компоненты/ChatSuggestions', component: ChatSuggestions,
  
  args: { suggestions: ['Какой курс мне подойдёт?', 'С чего начать развитие?'], onSelect: fn(), disabled: false },
} satisfies Meta<typeof ChatSuggestions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
