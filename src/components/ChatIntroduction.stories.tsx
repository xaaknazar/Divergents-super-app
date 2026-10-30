import type { Meta,StoryObj } from '@storybook/react-native';
import { ChatIntroduction } from './ChatIntroduction';
const meta = { title: 'Компоненты/ChatIntroduction', component: ChatIntroduction,
  
  args: { title: 'Спросите что угодно', description: 'Демонстрация: помощь с курсами и развитием.' },
} satisfies Meta<typeof ChatIntroduction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
