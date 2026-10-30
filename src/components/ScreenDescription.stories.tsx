import type { Meta,StoryObj } from '@storybook/react-native';
import { ScreenDescription } from './ScreenDescription';

const meta = { title: 'Компоненты/ScreenDescription', component: ScreenDescription,
  
  args: { text: 'Демонстрация описания раздела' },
} satisfies Meta<typeof ScreenDescription>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
