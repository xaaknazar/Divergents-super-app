import type { Meta,StoryObj } from '@storybook/react-native';
import { ContentLoading } from './ContentLoading';
const meta = { title: 'Компоненты/ContentLoading', component: ContentLoading,
  
  args: {  },
} satisfies Meta<typeof ContentLoading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const CompactLargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
