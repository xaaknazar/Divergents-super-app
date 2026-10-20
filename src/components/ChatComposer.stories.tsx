import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ChatComposer } from './ChatComposer';
const meta = { title: 'Компоненты/ChatComposer', component: ChatComposer,
  
  args: { value: '', onChangeText: fn(), onSend: fn(), disabled: false, busy: false, placeholder: 'Спросите ассистента…' },
} satisfies Meta<typeof ChatComposer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
